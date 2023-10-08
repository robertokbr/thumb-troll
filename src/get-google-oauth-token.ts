import { OAuth2Client } from 'google-auth-library';
import readline from 'readline';
import path from 'node:path';
import fs from 'node:fs';

export class GetGoogleOAuthToken {
    private readonly SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];
    private readonly TOKEN_PATH = path.resolve(__dirname, '../google-token.json');

    async execute(oAuth2Client: OAuth2Client) {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.SCOPES,
        });

        console.info('Authorize this app by visiting this URL: ', authUrl);

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, async (err: any, token: any) => {
                if (err) return console.error('Error retrieving access token:', err);

                try {
                    oAuth2Client.setCredentials(token);
                    await fs.promises.writeFile(this.TOKEN_PATH, JSON.stringify(token))
                } catch {
                    console.error('Error while writing token to file');
                }
            });
        });
    }
}
