import { google, youtube_v3 } from 'googleapis';
import path from 'node:path';
import generateImageFromHTML from './utils/gen-image.js';
import { renderHTML } from './utils/render-html';
import fs from 'node:fs';
import { OAuth2Client } from 'google-auth-library';
import { GetGoogleOAuthToken } from './get-google-oauth-token';
import { UploadToS3 } from './upload-to-s3';

type Comment = {
    author: string;
    comment: string;
}

type YouTubeComment = {
    textDisplay: string;
    authorDisplayName: string;
    authorProfileImageUrl: string;
}

export class UpdateThumb {
    private readonly TOKEN_PATH = path.resolve(__dirname, '../google-token.json');
    private readonly VIDEO_TITLE = process.env.VIDEO_TITLE as string;
    private readonly VIDEO_ID = process.env.VIDEO_ID as string;
    private readonly COMMENTS_PATH = path.resolve(__dirname, '../comments.json');
    private readonly MAX_RESULTS = 50;
    private readonly oAuth2Client: OAuth2Client;

    private currentComment = '';
    private categoryId = '';
    private currentTitle = '';

    private getAccessToken = new GetGoogleOAuthToken()
    private uploadToS3 = new UploadToS3();

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

    private removeFromStringCharactersThatCanCauseProblems(str: string) {
        return str.replace(/[^a-zA-Z0-9]/g, '');
    }

    private async getCommentToUse(data: youtube_v3.Schema$CommentThread[] | undefined) {
        if (!data) {
            return;
        }

        const comments = path.resolve(this.COMMENTS_PATH);

        const commentsBuffer = await fs.promises.readFile(comments).catch(() => {
            return Buffer.from('[]');
        });

        const commentsJSON = JSON.parse(commentsBuffer.toString()) as Comment[];

        const currentComment = data.filter(c =>
            c.snippet?.topLevelComment?.snippet?.authorDisplayName !== 'Bero'
        ).reverse().find((comment) => {
            const commentAuthor = comment.snippet?.topLevelComment?.snippet?.authorDisplayName as string;
            const commentContent = comment.snippet?.topLevelComment?.snippet?.textDisplay as string;

            const alreadyCommented = commentsJSON.find((comment) => {
                return comment.author === commentAuthor && comment.comment === commentContent;
            });

            return !alreadyCommented;
        });

        if (currentComment) {
            commentsJSON.push({
                author: currentComment.snippet?.topLevelComment?.snippet?.authorDisplayName as string,
                comment: currentComment.snippet?.topLevelComment?.snippet?.textDisplay as string,
            });

            await fs.promises.writeFile(comments, JSON.stringify(commentsJSON));
        }

        return currentComment;
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
        } = response.data.items?.[0].statistics as any;

        if (!this.categoryId) {
            const category = await youtube.videoCategories.list({
                part: ['snippet'],
                regionCode: 'BR',
            });

            this.categoryId = category.data.items?.[0].id as string;
        }

        const title = this.VIDEO_TITLE + ` Ele já tem ${commentCount} comentários feitos por insolentes`;

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

            console.log('Video title updated successfully:', videoResponse, new Date());
        }

        const newComment = await this.getCommentToUse(commentsResponse.data.items);

        if (!newComment) {
            console.info('No new comments found.', new Date());
            return;
        }

        const lastComment = newComment.snippet?.topLevelComment?.snippet as YouTubeComment;

        if (lastComment.authorDisplayName === this.currentComment) {
            console.info('Thumbnail already updated.');
            return;
        }

        this.currentComment = lastComment.authorDisplayName;

        let imagePath = path.resolve(__dirname, `../tmp/${
            this.removeFromStringCharactersThatCanCauseProblems(lastComment.authorDisplayName)
        }-last-comment.png`)

        const htmlString = renderHTML({
            comment: lastComment.textDisplay,
            name: lastComment.authorDisplayName,
            imageURL: lastComment.authorProfileImageUrl
        });

        await generateImageFromHTML(htmlString, imagePath);

        try {
            await this.uploadToS3.execute(imagePath, `${
                this.removeFromStringCharactersThatCanCauseProblems(lastComment.authorDisplayName)
            }-last-comment.png`);
            console.log('Image uploaded successfully');
        }  catch (error) {
            console.error('Error generating image from HTML:', error);
        }

        try {
            console.log('Updating thumbnail...');

            const body = await fs.promises.readFile(imagePath);

            await youtube.thumbnails.set({
                videoId: process.env.VIDEO_ID,
                media: {
                    mimeType: 'image/png',
                    body,
                },
            });

            console.log('Thumbnail updated successfully:', new Date());

        } catch (error) {
            console.error('Error updating thumbnail', new Date());
        }
    }

    public async execute() {
        await this.uploadThumbnail();

        setTimeout(() => {
            this.execute();
        }, 1000 * 60 * 5);
    }
}

