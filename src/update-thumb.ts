import { google } from 'googleapis';
import readline from 'readline';
import path from 'node:path';
import generateImageFromHTML from './utils/gen-image.js';
import { renderHTML } from './utils/render-html';
import fs from 'node:fs';

function update() {
    console.log('Starting thumbnail update...')

    const SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl'];
    const TOKEN_PATH = path.resolve(__dirname, '../google-token.json'); 
    
    
    // Load client secrets from a file
    const credentials = require(path.resolve(__dirname, '../google-cred.json'));
    
    // Create an OAuth2 client
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    
    // Check if we have previously stored a token
    fs.promises.readFile(TOKEN_PATH)
    .then(token => {
        oAuth2Client.setCredentials(JSON.parse(token.toString()));
        getLastComment();
    })
    .catch(err => {
        getAccessToken(oAuth2Client, getLastComment);
    });
    
    function getAccessToken(oAuth2Client: any, callback: any) {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });
        
        console.log('Authorize this app by visiting this URL:', authUrl);
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err: any, token: any) => {
                if (err) return console.error('Error retrieving access token:', err);
                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                fs.promises.writeFile(TOKEN_PATH, JSON.stringify(token))
                .then(() => {
                    console.log('Token stored to', TOKEN_PATH);
                    callback();
                })
                .catch(err => {
                    console.error('Error storing token:', err);
                    callback();
                });
            });
        });
    }
    
    // Create a YouTube client
    const youtube = google.youtube({
        version: 'v3',
        auth: oAuth2Client,
    });
    
    async function getLastComment() {
        const maxResults = 50;
        const videoId = process.env.VIDEO_ID;
        
        const commentsResponse = await youtube.commentThreads.list({
            maxResults,
            videoId,
            part: ['snippet'],
        });
        
        const lastComment = commentsResponse.data.items?.[1].snippet?.topLevelComment?.snippet as any;
        
        const htmlString = renderHTML({ comment: lastComment.textDisplay, name: lastComment.authorDisplayName, imageURL: lastComment.authorProfileImageUrl });
        
        await generateImageFromHTML(htmlString, path.resolve(__dirname, '../tmp/last-comment.png'));
        
        try {
            console.log('Updating thumbnail...');
            
            const body = await fs.promises.readFile(path.resolve(__dirname, '../tmp/last-comment.png'));
            
            console.log('Thumbnail image read successfully');
            
            // Upload the new thumbnail image
            const thumbnailResponse = await youtube.thumbnails.set({
                videoId: process.env.VIDEO_ID,
                media: {
                    mimeType: 'image/png', // Adjust the MIME type if needed
                    body,
                },
            });
            
            console.log('Thumbnail updated successfully:', thumbnailResponse.data);
            
        } catch (error) {
            console.error('Error updating thumbnail:', error);
        }
    }
}

function execute() {
    update();
    setTimeout(() => {
        execute();
    }, 1000 * 60 * 2);
}

export const updateThumb = {
    execute,
}

