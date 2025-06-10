import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import * as fs from "fs";
import * as path from "path";

// Ensure your GITHUB_TOKEN environment variable is set before running this script:
// In PowerShell: $env:GITHUB_TOKEN="YOUR_ACTUAL_API_KEY_HERE"
const token = process.env["GITHUB_TOKEN"];

// Confirm the endpoint and model name are correct for your Azure AI deployment
const endpoint = "https://models.inference.ai.azure.com"; // Your Azure AI Inference endpoint
const modelName = "Llama-4-Maverick-17B-128E-Instruct-FP8"; // The specific multimodal model

export async function main() {

  // --- Start of essential token check ---
  if (!token) {
    console.error("CRITICAL ERROR: GITHUB_TOKEN environment variable is not set.");
    console.error("This token is used as the API Key for the Azure AI Inference endpoint.");
    console.error("Please set it using: $env:GITHUB_TOKEN=\"YOUR_API_KEY\" (PowerShell) in your terminal.");
    process.exit(1);
  }
  // --- End of essential token check ---

  // 1. Read the image file and encode as base64
  const imageFileName = "contoso_layout_sketch.jpg";
  const imagePath = path.join(process.cwd(), imageFileName);

  // Check if the image file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`Error: Image file not found at ${imagePath}`);
    console.error(`Please ensure '${imageFileName}' is in the same directory as '${path.basename(__filename)}'.`);
    process.exit(1);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString("base64");

  // 2. Initialize the AI client with the endpoint and API key
  let client;
  try {
    client = ModelClient(
      endpoint,
      new AzureKeyCredential(token),
    );
  } catch (clientError) {
    console.error("Error creating ModelClient instance:", clientError);
    if (clientError && typeof clientError === 'object') {
        console.error("Client error details:", JSON.stringify(clientError, null, 2));
    }
    throw clientError;
  }

  // 3. Prepare and send the chat completion request
  let response;
  try {
    response = await client.path("/chat/completions").post({
      body: {
        messages: [
          // Completed system message
          { role:"system", content: "You are a helpful frontend developer who can write HTML and CSS code from user descriptions and images." },
          {
            role: "user",
            content: [
              // Completed user text prompt
              {
                type: "text",
                text: "Write HTML and CSS code for a web page based on the following hand-drawn sketch."
              },
              {
                type: "image_url",
                // Correct format for base64 image data (assuming it's a JPEG)
                // You might need to change 'image/jpeg' to 'image/png' or 'image/gif' based on your image type
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ]
          }
        ],
        // Completed model parameters
        temperature: 0.7, // Controls randomness: 0.0 (deterministic) to 1.0 (more creative)
        top_p: 0.95,      // Nucleus sampling: limits the token selection
        max_tokens: 500, // Maximum number of tokens to generate in the response
        model: modelName  // The specific model to use
      }
    });
  } catch (postError) {
    console.error("Error during client.path(...).post() call (network or request issue):", postError);
    if (postError && typeof postError === 'object') {
        console.error("Post call error details:", JSON.stringify(postError, null, 2));
    }
    throw postError;
  }

  // 4. Handle the API response
  if (isUnexpected(response)) {
    console.error("API returned an unexpected response (not a successful 2xx status).");
    console.error("Full response body:", response.body);
    throw response.body.error || new Error(`API error without specific error message: ${JSON.stringify(response.body)}`);
  }

  // Print the AI's generated content (HTML/CSS)
  console.log(response.body.choices[0].message.content);
}

// Global error handling for the main function
main().catch((err) => {
  console.error("\n--- Final Catch Block Error ---");
  console.error("The sample encountered an error:", err);
  if (err && typeof err === 'object') {
    console.error("Error details (JSON):", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
  } else {
    console.error("Error was not an object or was undefined:", err);
  }
  console.error("--- End Final Catch Block Error ---");
}); 