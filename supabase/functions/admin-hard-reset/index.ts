import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Create admin client with service role key
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        })

        // Get the authorization header to verify the calling user
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create a client with the user's token to verify they are authorized
        const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
            global: { headers: { Authorization: authHeader } },
        })

        // Get the current user
        const { data: { user: callingUser }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !callingUser) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Verify user is an admin
        const { data: roleData, error: roleError } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', callingUser.id)
            .eq('role', 'admin')
            .single()

        if (roleError || !roleData) {
            return new Response(
                JSON.stringify({ error: 'Insufficient permissions' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check system settings to see if hard reset is enabled
        // Note: We use query with maybeSingle() just in case default isn't there, defaulting to fail safe
        const { data: settingsData, error: settingsError } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'hard_reset_enabled')
            .maybeSingle()

        let isEnabled = false
        if (settingsData && settingsData.value) {
            if (settingsData.value === true || settingsData.value === 'true') {
                isEnabled = true
            }
        }

        if (!isEnabled) {
            return new Response(
                JSON.stringify({ error: 'Hard reset is not enabled in system settings' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Hard reset initiated by user ${callingUser.id}`)

        // 1. Delete all business units (Cascades to almost everything: sales, customers, employees, inventory, etc.)
        const { error: businessError } = await supabaseAdmin
            .from('business_units')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

        if (businessError) {
            console.error('Error deleting business units:', businessError)
            throw businessError
        }

        // 2. Delete all other users from auth.users (except the caller)
        // Supabase Admin API limitation: listUsers returns paginated results.
        // For a robust implementation, we should loop until no more users.
        // However, assuming for now the scale is manageable or this runs multiple times if needed.

        let hasMoreUsers = true
        let page = 1
        const perPage = 50

        while (hasMoreUsers) {
            const { data: users, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
                page: page,
                perPage: perPage
            })

            if (listUsersError) {
                console.error('Error listing users:', listUsersError)
                throw listUsersError
            }

            const usersToDelete = users.users
                .filter(u => u.id !== callingUser.id)
                .map(u => u.id)

            if (usersToDelete.length > 0) {
                for (const userId of usersToDelete) {
                    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)
                    if (deleteUserError) {
                        console.error(`Failed to delete user ${userId}:`, deleteUserError)
                    }
                }
            }

            if (users.users.length < perPage) {
                hasMoreUsers = false
            } else {
                page++
            }
        }

        return new Response(
            JSON.stringify({ success: true, message: 'System hard reset completed successfully' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
