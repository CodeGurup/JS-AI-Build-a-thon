targetScope = 'subscription'

// ---------------------------------------------------------------------------
// Parameters

@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

param rg string = ''

// ❗ Customize or override these if needed
@description('Unique name for the Web API App Service')
param webapiName string = ''
@description('Unique name for the App Service Plan')
param appServicePlanName string = ''

@description('Location for the Static Web App')
@allowed([
  'westus2'
  'centralus'
  'eastus2'
  'westeurope'
  'eastasia'
  'eastasiastage'
])
@metadata({
  azd: {
    type: 'location'
  }
})
param webappLocation string

@description('Id of the user or app to assign application roles')
param principalId string

// ---------------------------------------------------------------------------
// Variables

var abbrs = loadJsonContent('./abbreviations.json')
var tags = {
  'azd-env-name': environmentName
}

// Ensures uniqueness for deployments across environments
var uniqueSuffix = uniqueString(subscription().id, environmentName)
var resolvedWebapiName = !empty(webapiName) ? webapiName : 'webapi-gontouch-${uniqueSuffix}'
var resolvedAppServicePlanName = !empty(appServicePlanName) ? appServicePlanName : 'appsvcplan-gontouch-${uniqueSuffix}'

// ---------------------------------------------------------------------------
// Resources

resource resourceGroup 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: !empty(rg) ? rg : '${abbrs.resourcesResourceGroups}${environmentName}'
  location: location
  tags: tags
}

// App Service Plan
module serverfarm 'br/public:avm/res/web/serverfarm:0.4.1' = {
  name: 'appserviceplan'
  scope: resourceGroup
  params: {
    name: resolvedAppServicePlanName
    skuName: 'B1'
  }
}

// Web API App Service
module webapi 'br/public:avm/res/web/site:0.15.1' = {
  name: 'webapi'
  scope: resourceGroup
  params: {
    kind: 'app'
    name: resolvedWebapiName
    tags: union(tags, { 'azd-service-name': 'webapi' })

    serverFarmResourceId: serverfarm.outputs.resourceId
  }
}

// ---------------------------------------------------------------------------
// Outputs

output WEBAPI_URL string = webapi.outputs.defaultHostname
