import { google } from 'googleapis';
import path from 'node:path';
import generateImageFromHTML from './utils/gen-image.js';
import { renderHTML } from './utils/render-html';
import fs from 'node:fs';
import { OAuth2Client } from 'google-auth-library';
import { GetGoogleOAuthToken } from './get-google-oauth-token';

type YouTubeComment = {
    textDisplay: string;
    authorDisplayName: string;
    authorProfileImageUrl: string;
}

export class UpdateThumb {
    private readonly TOKEN_PATH = path.resolve(__dirname, '../google-token.json');
    private readonly VIDEO_TITLE = process.env.VIDEO_TITLE as string;
    private readonly VIDEO_ID = process.env.VIDEO_ID as string;
    private readonly MAX_RESULTS = 50;
    private readonly oAuth2Client: OAuth2Client;

    private currentComment = '';
    private getAccessToken = new GetGoogleOAuthToken()
    private categoryId = '';
    private currentTitle = '';

    constructor(){
        const credentials = require(path.resolve(__dirname, '../google-cred.json'));

        const { client_secret, client_id, redirect_uris } = credentials.installed;

        this.oAuth2Client = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris[0]
        );
    }

    private async setToken() {
        try {
            const token = await fs.promises.readFile(this.TOKEN_PATH)
            this.oAuth2Client.setCredentials(JSON.parse(token.toString()));
        } catch {
            await this.getAccessToken.execute(this.oAuth2Client);
        }
    }

    private async uploadThumbnail() {
        await this.setToken();

        const youtube = google.youtube({
            version: 'v3',
            auth: this.oAuth2Client,
        });

        const commentsResponse = await youtube.commentThreads.list({
            videoId: this.VIDEO_ID,
            part: ['snippet'],
        });

        const response = await youtube.videos.list({
            part: ['statistics'],
            id: [this.VIDEO_ID],
        });

        const {
            commentCount,
            likeCount,
            viewCount,
         } = response.data.items?.[0].statistics as any;

        if (!this.categoryId) {
            const category = await youtube.videoCategories.list({
                part: ['snippet'],
                regionCode: 'BR',
            });

            this.categoryId = category.data.items?.[0].id as string;
        }

        const title = `Esse vídeo tem ${commentCount} comentários, ${likeCount} likes e ${viewCount} visualizações! `;

        if (title !== this.currentTitle) {
            this.currentTitle = title;

            // update video title
            const videoResponse = await youtube.videos.update({
                part: ['snippet'],
                requestBody: {
                    id: this.VIDEO_ID,
                    snippet: {
                        title,
                        categoryId: this.categoryId,
                    },
                },
            });

            console.log('Video title updated successfully:', videoResponse.data);
        }

        let lastComment: YouTubeComment = commentsResponse.data.items?.[1].snippet?.topLevelComment?.snippet as any;

        if (lastComment.authorDisplayName === this.currentComment) {
            console.info('Thumbnail already updated.');
            return;
        }

        this.currentComment = lastComment.authorDisplayName;

        let imagePath = path.resolve(__dirname, `../tmp/${lastComment.authorDisplayName}-last-comment.png`)

        const htmlString = renderHTML({
            comment: lastComment.textDisplay,
            name: lastComment.authorDisplayName,
            imageURL: lastComment.authorProfileImageUrl
        });

        await generateImageFromHTML(htmlString, imagePath);

        try {
            console.log('Updating thumbnail...');

            const body = await fs.promises.readFile(imagePath);

            const thumbnailResponse = await youtube.thumbnails.set({
                videoId: process.env.VIDEO_ID,
                media: {
                    mimeType: 'image/png',
                    body,
                },
            });

            console.log('Thumbnail updated successfully:', thumbnailResponse.data);

        } catch (error) {
            console.error('Error updating thumbnail:', error);
        }
    }

    public async execute() {
        await this.uploadThumbnail();

        setTimeout(() => {
            this.execute();
        }, 1000 * 60 * 2);
    }
}

