import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

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

    // Verify user is superadmin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (!profile || profile.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Only superadmins can send invitations" }, { status: 403 })
    }

    const body = await request.json()
    const { memberId, organizationId } = body

    if (!memberId || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: memberId, organizationId" },
        { status: 400 },
      )
    }

    // Get member details
    const { data: member, error: memberError } = await supabase
      .from("profiles")
      .select("id, email, name")
      .eq("id", memberId)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Use service role to send invitation email via Supabase Auth
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      console.error("[send-invitation] SUPABASE_SERVICE_ROLE_KEY is not configured")
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

    // Generate invitation link
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback?invite=true&org=${organizationId}`
    
    // First, check if user already exists in auth
    let existingAuthUser
    try {
      const { data, error } = await serviceRoleClient.auth.admin.getUserById(member.id)
      if (!error && data?.user) {
        existingAuthUser = data.user
      }
    } catch (err) {
      console.log(`[send-invitation] Could not find user by ID, will check by email`)
    }

    // If not found by ID, try to find by email
    if (!existingAuthUser) {
      try {
        const { data: users } = await serviceRoleClient.auth.admin.listUsers()
        existingAuthUser = users.users.find((u) => u.email === member.email)
      } catch (err) {
        console.log(`[send-invitation] Could not list users, will try invitation`)
      }
    }
    
    if (existingAuthUser) {
      // User already exists in auth
      // Send password reset email (magic link) which allows setting/resetting password
      console.log(`[send-invitation] User ${member.email} already exists, sending password reset email`)
      
      // Create a regular client (not service role) to send password reset email
      // resetPasswordForEmail requires a non-admin client and sends email automatically
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
        console.error("[send-invitation] Error sending password reset:", resetError)
        
        // Fallback: generate link manually (won't send email automatically)
        const { data: linkData, error: linkError } = await serviceRoleClient.auth.admin.generateLink({
          type: "recovery",
          email: member.email,
          options: {
            redirectTo,
          },
        })

        if (linkError) {
          return NextResponse.json(
            {
              error: "Failed to send access link",
              message: `No se pudo enviar el enlace de acceso a ${member.email}. El usuario ya está registrado.`,
            },
            { status: 400 },
          )
        }

        return NextResponse.json({
          success: false,
          error: "Email not sent automatically",
          message: `El usuario ${member.email} ya está registrado. Se generó un enlace de recuperación, pero el email no se pudo enviar automáticamente. Configura SMTP personalizado en Supabase para habilitar el envío automático de emails.`,
          member: {
            id: member.id,
            email: member.email,
            name: member.name,
          },
          organization: {
            id: organization.id,
            name: organization.name,
          },
          recoveryLink: linkData?.properties?.action_link,
        })
      }

      console.log(`[send-invitation] Password reset email sent successfully to ${member.email}`)

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

    // User doesn't exist in auth, send invitation
    console.log(`[send-invitation] User ${member.email} doesn't exist, sending invitation`)
    
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
      console.error("[send-invitation] Error sending invitation:", inviteError)
      
      // If user already exists (race condition), generate recovery link
      if (inviteError.message?.includes("already registered") || inviteError.message?.includes("already exists")) {
        console.log(`[send-invitation] User exists (race condition), generating recovery link instead`)
        
        const { data: linkData, error: linkError } = await serviceRoleClient.auth.admin.generateLink({
          type: "recovery",
          email: member.email,
          options: {
            redirectTo,
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

    console.log(`[send-invitation] Invitation sent successfully to: ${member.email} for organization: ${organization.name}`)

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
    console.error("[send-invitation] Error:", error)
    return NextResponse.json(
      {
        error: "Failed to send invitation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}