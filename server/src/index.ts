import { networkInterfaces } from 'node:os';
import { createApp } from './app.js';
import { config } from './config.js';
import { migrate } from './migrate.js';

await migrate();

createApp().listen(config.port, '0.0.0.0', () => {
  console.log(`Loan API listening on http://localhost:${config.port}`);
  // The phone needs your computer's Wi-Fi address, not localhost.
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) console.log(`  on your network: http://${net.address}:${config.port}`);
    }
  }
  if (config.otpInResponse) console.log('  demo mode: OTPs are also sent back to the app (OTP_IN_RESPONSE=true)');
});
