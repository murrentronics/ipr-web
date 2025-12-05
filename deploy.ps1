Set-StrictMode -Version Latest
Set-Alias npm npm.cmd

    # Define variables for easier modification
    $projectDir = "C:\Users\Trecia\IPR-Web\ipr-web"
    $remoteUser = "u2434-z1xcpwxs0vtm"
    $remoteHost = "ssh.theronm22.sg-host.com"
    $remotePort = "18765"
    $remotePath = "/home/customer/www/theronm22.sg-host.com/public_html/"

    Write-Host "Starting deployment process..."

    # 1. Navigate to the project directory
    Write-Host "Navigating to project directory: $projectDir"
    Set-Location $projectDir

    # 2. Run the build command
    Write-Host "Running npm run build..."
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "NPM build failed. Aborting deployment."
        exit 1
    }
    Write-Host "NPM build completed successfully."

    # Check if the build was successful and dist directory exists
    if (-not (Test-Path "$projectDir\dist")) {
        Write-Error "Build failed or 'dist' directory not found. Aborting deployment."
        exit 1
    }

    Write-Host "Ensuring remote public_html directory exists..."
    ssh -p $remotePort "${remoteUser}@${remoteHost}" "mkdir -p ${remotePath}"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to ensure remote public_html directory exists. SSH exit code: $LASTEXITCODE"
        exit 1
    }

    # 3. Clean up remote public_html directory before transferring new files
    Write-Host "Cleaning up remote public_html directory contents..."
    ssh -v -p $remotePort "${remoteUser}@${remoteHost}" "rm -f ${remotePath}/.htaccess && rm -rf ${remotePath}/*"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to clean up remote public_html directory. SSH exit code: $LASTEXITCODE"
        exit 1
    }

    # 4. Run the scp commands to transfer files



    Write-Host "Transferring all dist folder contents to SiteGround via scp..."
    scp -P $remotePort -r "${projectDir}\dist\*" "${remoteUser}@${remoteHost}:${remotePath}"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to transfer dist folder contents. SCP exit code: $LASTEXITCODE"
        exit 1
    }
    Write-Host "All dist folder contents transferred successfully."

    Write-Host "Transferring .htaccess file to SiteGround via scp..."
    scp -P $remotePort "${projectDir}\.htaccess" "${remoteUser}@${remoteHost}:${remotePath}.htaccess"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to transfer .htaccess file. SCP exit code: $LASTEXITCODE"
        exit 1
    }
    Write-Host ".htaccess file transferred."

    

    Write-Host "Deployment completed successfully!"
