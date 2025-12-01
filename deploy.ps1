# deploy.ps1

# Define variables for easier modification
$projectDir = "C:\Users\Trecia\IPR-Web\ipr-web"
$remoteUser = "u2403-i05uh5edcfpj"
$remoteHost = "ssh.theronm21.sg-host.com"
$remotePort = "18765"
$remotePath = "/home/u2403-i05uh5edcfpj/public_html/"

Write-Host "Starting deployment process..."

# 1. Navigate to the project directory
Write-Host "Navigating to project directory: $projectDir"
Set-Location $projectDir

# 2. Run the build command
Write-Host "Running npm run build..."
npm run build

# Check if the build was successful and dist directory exists
if (-not (Test-Path "$projectDir\dist")) {
    Write-Error "Build failed or 'dist' directory not found. Aborting deployment."
    exit 1
}

# 3. Clean up remote www directory before transferring new files
Write-Host "Cleaning up remote www directory..."
ssh -p $remotePort "${remoteUser}@${remoteHost}" "rm -rf ${remotePath}*"

# 4. Run the scp command to transfer files
Write-Host "Transferring files to SiteGround via scp..."
# Note: scp will prompt for password if not using SSH keys with agent
scp -P $remotePort -r "${projectDir}\dist\." "${remoteUser}@${remoteHost}:${remotePath}"

# Transfer .htaccess file
Write-Host "Transferring .htaccess file to SiteGround via scp..."
scp -P $remotePort "${projectDir}\.htaccess" "${remoteUser}@${remoteHost}:${remotePath}.htaccess"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment completed successfully!"
} else {
    Write-Error "SCP transfer failed with exit code $LASTEXITCODE. Please check the output above for details."
}