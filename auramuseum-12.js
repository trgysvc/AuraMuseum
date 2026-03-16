Alright, I need to fix the code for the AuraMuseum project based on the user's feedback. The user mentioned two main issues: the use of non-native modules 'pg' and 'ws', and over-engineering by using PostgreSQL for a simple system.

First, I'll address the non-native modules. The original code used 'pg' for PostgreSQL and 'ws' for WebSockets. Since these are third-party libraries not allowed by the Native Manifesto, I need to replace them. For the database, I'll switch to using localStorage in Node.js, which is a built-in module. For real-time updates, instead of WebSockets, I'll implement a simple polling mechanism using native Node.js features.

Next, I'll simplify the database handling. Instead of a full PostgreSQL setup, localStorage will store artifacts in memory. This makes the solution lighter and more appropriate for a simple system. I'll create functions to get, update, and move artifacts using localStorage.

For real-time updates, since WebSockets are off the table, I'll use a setInterval loop to periodically check for changes. When an artifact's status changes, it will trigger an update event. This way, clients can poll for changes without needing external libraries.

I'll also ensure that the code adheres to the Native Manifesto by using only Node.js built-ins. This means removing any dependencies on 'pg' and 'ws' and relying on the standard library for all functionality.

Now, I'll restructure the code. The checkEnvironment function remains the same, but the updateArtifactStatus function will now use localStorage to update the artifact's status. The moveArtifact function will also interact with localStorage to change the artifact's location, but only if it's not locked.

I'll set up a simple HTTP server using Node.js's http module to handle client connections. The server will listen for incoming requests and handle them accordingly, providing a basic endpoint for clients to receive updates.

Testing the example usage, I'll ensure that inserting an artifact, updating its status, and attempting to move it all work correctly with the new localStorage setup. This will confirm that the system functions as intended without the third-party modules.

Finally, I'll make sure the code is clean, modular, and handles errors gracefully, all while adhering to the user's requirements and the Native Manifesto guidelines.
</think>

```javascript
const http = require('http');
const url = require('url');

// In-memory storage for artifacts
let artifacts = [];

// Check environment conditions
function checkEnvironment(temperature, humidity) {
  const safeTempRange = { min: 18, max: 22 };
  const safeHumidityRange = { min: 30, max: 50 };
  
  const isTemperatureCritical = temperature < safeTempRange.min || temperature > safeTempRange.max;
  const isHumidityCritical = humidity < safeHumidityRange.min || humidity > safeHumidityRange.max;
  
  return {
    isCritical: isTemperatureCritical || isHumidityCritical,
    temperature,
    humidity
  };
}

// Update artifact status
function updateArtifactStatus(artifactId) {
  return new Promise((resolve, reject) => {
    try {
      // Get current environment data
      const { isCritical, temperature, humidity } = checkEnvironment(
        20, // temperature
        40 // humidity
      );

      // Update artifact status
      artifacts = artifacts.map(artifact => {
        if (artifact.id === artifactId) {
          return {
            ...artifact,
            condition_status: isCritical ? 'critical' : 'stable',
            lab_locked: isCritical,
            temperature,
            humidity
          };
        }
        return artifact;
      });

      // Broadcast status update
      if (server) {
        server.clients.forEach(client => {
          if (client.readyState === 'open') {
            client.write(JSON.stringify({
              type: 'ARTIFACT_STATUS_UPDATE',
              data: artifacts.find(a => a.id === artifactId)
            }));
          }
        });
      }

      resolve(artifacts.find(a => a.id === artifactId));
    } catch (error) {
      reject(error);
    }
  });
}

// Move artifact
async function moveArtifact(artifactId, newLocation) {
  try {
    const artifact = artifacts.find(a => a.id === artifactId);
    
    if (!artifact || artifact.lab_locked) {
      throw new Error('Artifact is locked due to critical condition');
    }

    artifacts = artifacts.map(a => 
      a.id === artifactId ? { ...a, location: newLocation } : a
    );

    return { status: 'success', message: 'Artifact moved successfully' };
  } catch (error) {
    throw error;
  }
}

// HTTP server
const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url, true);
  
  if (pathname === '/updates') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Poll for updates every second
    const interval = setInterval(() => {
      res.write('data: ' + JSON.stringify({
        type: 'ARTIFACT_STATUS_UPDATE',
        data: artifacts
      }) + '\n\n');
    }, 1000);

    req.on('close', () => clearInterval(interval));
  } else {
    res.writeHead(404);
    res.end();
  }
});

// Example usage
async function exampleUsage() {
  try {
    // Insert test artifact
    const newArtifact = {
      id: Date.now(),
      name: 'Test Artifact',
      location: 'Storage Room 1',
      condition_status: 'stable',
      lab_locked: false,
      temperature: 20,
      humidity: 40
    };
    
    artifacts.push(newArtifact);
    
    console.log('Inserted artifact:', newArtifact);
    
    // Update status
    const updatedArtifact = await updateArtifactStatus(newArtifact.id);
    console.log('Updated artifact status:', updatedArtifact);
    
    // Try to move artifact
    try {
      const moveResult = await moveArtifact(newArtifact.id, 'Exhibition Hall');
      console.log('Move result:', moveResult);
    } catch (error) {
      console.error('Move failed:', error.message);
    }
  } catch (error) {
    console.error('Example usage failed:', error);
  }
}

exampleUsage();
server.listen(8080, () => console.log('Server running on port 8080'));
```