console.log("Hello World! This code runs immediately when the file is loaded.");

Hooks.on("init", function() {
  console.log("This code runs once the Foundry VTT software begins its initialization workflow.");
});

Hooks.on("ready", function() {
  console.log("This code runs once core initialization is ready and game data is available.");
});

const TOOL_NAME="hlo-foundry-integration"
const HERO_LAB_URL="https://api.herolab.online"

let userToken = null
let elementToken = null

Hooks.on('ready', main);

async function main() {
  await acquireAccessToken()
}

async function acquireAccessToken() {
  //construct and submit a request to acquire an access token
  const route = "/v1/access/acquire-access-token"
  const request = {
    refreshToken: userToken, 
    toolName: TOOL_NAME,
    callerId: 123
}
const response = await submitRequest(route, request)

console.log(response.accessToken);
//extract the access token
accessToken = response.accessToken
}

async function submitRequest(url, request) {
  //serialize the data to json for submission
  const json = JSON.stringify(request)

  //submit the request
  url = HERO_LAB_URL + url
  const response = await fetch(url, { 
     method: 'POST', 
     headers: {
        'Content-Type': 'application/json'
     },
     body: json
  })

   //deserialize the response body into the proper object
   const responseBody = await response.json()

   //sanity check the results and return them
   assert(responseBody.severity === Severity.Success, "submitRequest response severity")
   assert(responseBody.result === Result.Success, "submitRequest response result")
   assert(responseBody.callerId === request.callerId, "submitRequest response callerId")

   return responseBody
}