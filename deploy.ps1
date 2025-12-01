# deploy.ps1

# Define variables for easier modification
$projectDir = "C:\Users\Trecia\IPR-Web\ipr-web"
$remoteUser = "u2434-z1xcpwxs0vtm"
$remoteHost = "ssh.theronm22.sg-host.com"
$remotePort = "18765"
$remotePath = "/home/u2434-z1xcpwxs0vtm/public_html/"

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

Write-Host "Ensuring remote public_html directory exists..."
ssh -p $remotePort "${remoteUser}@${remoteHost}" "mkdir -p ${remotePath}"

# 3. Clean up remote public_html directory before transferring new files
Write-Host "Cleaning up remote public_html directory contents..."
ssh -p $remotePort "${remoteUser}@${remoteHost}" "rm -rf ${remotePath}/*"

# 4. Run the scp commands to transfer files
Write-Host "Transferring index.html to SiteGround via scp..."
scp -P $remotePort "${projectDir}\dist\index.html" "${remoteUser}@${remoteHost}:${remotePath}index.html"
Write-Host "index.html transferred."

Write-Host "Transferring assets directory to SiteGround via scp..."
scp -P $remotePort -r "${projectDir}\dist\assets" "${remoteUser}@${remoteHost}:${remotePath}assets"

# Transfer .htaccess file
Write-Host "Transferring .htaccess file to SiteGround via scp..."
scp -P $remotePort "${projectDir}\.htaccess" "${remoteUser}@${remoteHost}:${remotePath}.htaccess"
Write-Host ".htaccess file transferred."

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment completed successfully!"
} else {
    Write-Error "SCP transfer failed with exit code $LASTEXITCODE. Please check the output above for details."
}