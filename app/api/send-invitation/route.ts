import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { getAppUrl } from "@/lib/app-config"

/**
 * POST /api/send-invitation
 * Sends an invitation email to a user using Supabase Auth
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is superadmin or org admin (admin can only resend for their own org)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, organization_id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { memberId, organizationId } = body

    const isSuperadmin = profile.role === "superadmin"
    const isOrgAdmin =
      profile.role === "admin" &&
      profile.organization_id != null &&
      profile.organization_id === organizationId
    if (!isSuperadmin && !isOrgAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only superadmins or organization admins can send invitations" },
        { status: 403 },
      )
    }

    if (!memberId || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: memberId, organizationId" },
        { status: 400 },
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "Server configuration error: Service role key not configured" },
        { status: 500 },
      )
    }

    const serviceRoleClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Get member and organization with service role so RLS does not block (admin may not have SELECT on other profiles)
    const { data: member, error: memberError } = await serviceRoleClient
      .from("profiles")
      .select("id, email, name, organization_id")
      .eq("id", memberId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    if (isOrgAdmin && member.organization_id !== organizationId) {
      return NextResponse.json({ error: "Forbidden: Member does not belong to your organization" }, { status: 403 })
    }

    const { data: organization, error: orgError } = await serviceRoleClient
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Generate invitation link - redirect to password setup page for new users
    // IMPORTANT: This URL must be in the Redirect URLs list in Supabase Dashboard
    const { getAppUrl } = await import("@/lib/app-config")
    const baseUrl = getAppUrl()
    const redirectTo = `${baseUrl}/auth/update-password?invite=true&org=${organizationId}`

    // First, check if user already exists in auth
    let existingAuthUser
    try {
      const { data, error } = await serviceRoleClient.auth.admin.getUserById(member.id)
      if (!error && data?.user) {
        existingAuthUser = data.user
      }
    } catch {
      // Will check by email below
    }
    if (!existingAuthUser) {
      try {
        const { data: users } = await serviceRoleClient.auth.admin.listUsers()
        existingAuthUser = users.users.find((u) => u.email === member.email)
      } catch {
        // Will try invitation below
      }
    }
    if (existingAuthUser) {
      const { data: linkData, error: linkError } = await serviceRoleClient.auth.admin.generateLink({
        type: "invite",
        email: member.email,
        options: {
          redirectTo,
          data: {
            name: member.name,
            organization_id: organizationId,
          },
        },
      })

      if (linkError) {
        // Fallback: use resetPasswordForEmail (but this uses recovery type with shorter expiration)
        const regularClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          },
        )
        
        const { error: resetError } = await regularClient.auth.resetPasswordForEmail(member.email, {
          redirectTo,
        })
        
        if (resetError) {
          return NextResponse.json(
            {
              error: "Failed to send access link",
              message: `No se pudo enviar el enlace de acceso a ${member.email}. El usuario ya está registrado.`,
            },
            { status: 400 },
          )
        }
        return NextResponse.json({
          success: true,
          message: `Se envió un enlace de recuperación de contraseña a ${member.email}. El usuario puede usar este enlace para establecer su contraseña y acceder al sistema.`,
          member: {
            id: member.id,
            email: member.email,
            name: member.name,
          },
          organization: {
            id: organization.id,
            name: organization.name,
          },
        })
      }
      
      // Note: generateLink doesn't send email automatically
      // You would need to send the email manually or configure SMTP in Supabase
      // For now, return the link so it can be sent manually if needed
      return NextResponse.json({
        success: true,
        message: `Enlace de invitación generado para ${member.email}. Si el correo no llegó, copia el enlace y envíalo manualmente.`,
        member: {
          id: member.id,
          email: member.email,
          name: member.name,
        },
        organization: {
          id: organization.id,
          name: organization.name,
        },
        inviteLink: linkData?.properties?.action_link,
      })
    }

    const { data: inviteData, error: inviteError } = await serviceRoleClient.auth.admin.inviteUserByEmail(
      member.email,
      {
        data: {
          name: member.name,
          organization_id: organizationId,
          organization_name: organization.name,
        },
        redirectTo,
      },
    )

    if (inviteError) {
      if (inviteError.message?.includes("already registered") || inviteError.message?.includes("already exists")) {
        const { data: linkData, error: linkError } = await serviceRoleClient.auth.admin.generateLink({
          type: "invite",
          email: member.email,
          options: {
            redirectTo,
            data: {
              name: member.name,
              organization_id: organizationId,
            },
          },
        })

        if (linkError) {
          return NextResponse.json(
            {
              error: "Failed to send access link",
              message: "El usuario ya está registrado. No se pudo generar el enlace de acceso.",
            },
            { status: 400 },
          )
        }

        return NextResponse.json({
          success: true,
          message: `El usuario ${member.email} ya está registrado. Se generó un enlace de recuperación de contraseña.`,
          link: linkData?.properties?.action_link,
          member: {
            id: member.id,
            email: member.email,
            name: member.name,
          },
          organization: {
            id: organization.id,
            name: organization.name,
          },
        })
      }

      return NextResponse.json(
        {
          error: "Failed to send invitation",
          message: inviteError.message || "Error al enviar la invitación",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Invitación enviada exitosamente a ${member.email}`,
      member: {
        id: member.id,
        email: member.email,
        name: member.name,
      },
      organization: {
        id: organization.id,
        name: organization.name,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to send invitation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}