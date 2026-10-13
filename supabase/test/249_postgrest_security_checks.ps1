param(
  [Parameter(Mandatory = $false)]
  [string]$SupabaseUrl = $env:SUPABASE_URL,

  [Parameter(Mandatory = $false)]
  [string]$AnonKey = $env:SUPABASE_ANON_KEY,

  [Parameter(Mandatory = $false)]
  [string]$AuthenticatedJwt = $env:MARKETPLACE_AUTHENTICATED_JWT
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) {
  throw 'SUPABASE_URL is required.'
}

if ([string]::IsNullOrWhiteSpace($AnonKey)) {
  throw 'SUPABASE_ANON_KEY is required.'
}

if ([string]::IsNullOrWhiteSpace($AuthenticatedJwt)) {
  throw 'MARKETPLACE_AUTHENTICATED_JWT is required.'
}

$baseUrl = $SupabaseUrl.TrimEnd('/')
$tables = @(
  'project_categories',
  'enterprises',
  'projects',
  'enterprise_projects',
  'project_media_allowed_hosts',
  'project_media',
  'admin_audit_log',
  'project_memberships',
  'project_activities',
  'project_activity_completions'
)
$rpcRequests = @(
  @{
    Name = 'marketplace_grant_project_membership'
    Body = '{"p_member_issuer":"security-test","p_member_subject":"security-test","p_member_user_id":null,"p_enterprise_id":"00000000-0000-0000-0000-000000000000","p_project_id":null,"p_scope_type":"enterprise","p_role":"partner_readonly","p_actor_issuer":"security-test","p_actor_subject":"security-test","p_actor_roles":[],"p_request_id":"security-test","p_reason":null}'
  },
  @{
    Name = 'marketplace_change_project_membership'
    Body = '{"p_membership_id":"00000000-0000-0000-0000-000000000000","p_new_role":"partner_readonly","p_new_status":"revoked","p_actor_issuer":"security-test","p_actor_subject":"security-test","p_actor_roles":[],"p_request_id":"security-test","p_reason":"security-test"}'
  },
  @{
    Name = 'marketplace_transition_project_status'
    Body = '{"p_project_id":"00000000-0000-0000-0000-000000000000","p_target_status":"published","p_actor_issuer":"security-test","p_actor_subject":"security-test","p_actor_roles":[],"p_request_id":"security-test","p_reason":null}'
  },
  @{
    Name = 'marketplace_approve_activity_completion'
    Body = '{"p_completion_id":"00000000-0000-0000-0000-000000000000","p_actor_issuer":"security-test","p_actor_subject":"security-test","p_actor_roles":[],"p_request_id":"security-test","p_notes":null}'
  },
  @{
    Name = 'marketplace_reverse_activity_completion'
    Body = '{"p_completion_id":"00000000-0000-0000-0000-000000000000","p_actor_issuer":"security-test","p_actor_subject":"security-test","p_actor_roles":[],"p_request_id":"security-test","p_reason":"security-test"}'
  }
)

function Invoke-ExpectedDeniedRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Label,

    [Parameter(Mandatory = $true)]
    [string]$Uri,

    [Parameter(Mandatory = $true)]
    [hashtable]$Headers,

    [Parameter(Mandatory = $false)]
    [ValidateSet('GET', 'POST')]
    [string]$Method = 'GET',

    [Parameter(Mandatory = $false)]
    [string]$Body
  )

  try {
    $request = @{
      Uri = $Uri
      Method = $Method
      Headers = $Headers
    }

    if ($Method -eq 'POST') {
      $request.ContentType = 'application/json'
      $request.Body = $Body
    }

    try {
      $response = Invoke-WebRequest @request
      $statusCode = [int]$response.StatusCode
    } catch {
      if ($null -eq $_.Exception.Response) {
        throw
      }

      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    if ($statusCode -notin @(401, 403)) {
      throw "$Label returned $statusCode; expected 401 or 403."
    }

    Write-Host "PASS $Label -> $statusCode"
  } catch {
    throw "PostgREST negative test failed for $Label. $($_.Exception.Message)"
  }
}

$identities = @(
  @{
    Name = 'anon'
    Token = $AnonKey
  },
  @{
    Name = 'authenticated'
    Token = $AuthenticatedJwt
  }
)

foreach ($identity in $identities) {
  $headers = @{
    apikey = $AnonKey
    Authorization = "Bearer $($identity.Token)"
    Prefer = 'count=exact'
  }

  foreach ($table in $tables) {
    Invoke-ExpectedDeniedRequest `
      -Label "$($identity.Name) GET $table" `
      -Uri "$baseUrl/rest/v1/$table?select=*&limit=1" `
      -Headers $headers

    Invoke-ExpectedDeniedRequest `
      -Label "$($identity.Name) POST $table" `
      -Uri "$baseUrl/rest/v1/$table" `
      -Headers $headers `
      -Method 'POST' `
      -Body '{}'
  }

  foreach ($rpcRequest in $rpcRequests) {
    Invoke-ExpectedDeniedRequest `
      -Label "$($identity.Name) RPC $($rpcRequest.Name)" `
      -Uri "$baseUrl/rest/v1/rpc/$($rpcRequest.Name)" `
      -Headers $headers `
      -Method 'POST' `
      -Body $rpcRequest.Body
  }
}

Write-Host 'All anon/authenticated PostgREST requests were denied as expected.'
