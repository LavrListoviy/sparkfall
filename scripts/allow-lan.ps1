#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
$ruleName = 'Sparkfall LAN playtest 4175'
$nodePath = (Get-Command node.exe).Source
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4175 -RemoteAddress LocalSubnet -Profile Private -Program $nodePath | Out-Null
}
Get-NetFirewallRule -DisplayName $ruleName | Select-Object DisplayName, Enabled, Profile
