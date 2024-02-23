import { google, youtube_v3 } from 'googleapis';
import path from 'node:path';
import fs from 'node:fs';
import { OAuth2Client } from 'google-auth-library';
import { GetGoogleOAuthToken } from './get-google-oauth-token';

type Comment = {
    author: string;
    comment: string;
    date?: string;
}

type YouTubeComment = {
    textDisplay: string;
    authorDisplayName: string;
    authorProfileImageUrl: string;
}

export class UpdateThumb {
    private readonly TOKEN_PATH = path.resolve(__dirname, '../google-token.json');
    private readonly VIDEO_ID = process.env.VIDEO_ID as string;
    private readonly COMMENTS_PATH = path.resolve(__dirname, '../comments.json');
    private readonly oAuth2Client: OAuth2Client;

    private categoryId = '';
    private currentTitle = '';

    private getAccessToken = new GetGoogleOAuthToken()

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

    private async getCommentToUse(data: youtube_v3.Schema$CommentThread[] | undefined) {
        if (!data) {
            return;
        }

        const comments = path.resolve(this.COMMENTS_PATH);

        const commentsBuffer = await fs.promises.readFile(comments).catch(() => {
            return Buffer.from("[]");
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
                date: new Date().toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                })
            });

            await fs.promises.writeFile(comments, JSON.stringify(commentsJSON));
        }

        return currentComment;
    }

    private async updateComment() {
        await this.setToken();

        const youtube = google.youtube({
            version: 'v3',
            auth: this.oAuth2Client,
        });

        const commentsResponse = await youtube.commentThreads.list({
            videoId: this.VIDEO_ID,
            part: ['snippet'],
        });

        if (!this.categoryId) {
            const category = await youtube.videoCategories.list({
                part: ['snippet'],
                regionCode: 'BR',
            });

            this.categoryId = category.data.items?.[0].id as string;
        }

        const newComment = await this.getCommentToUse(commentsResponse.data.items);

        if (!newComment) {
            console.info('No new comments found.', new Date());
            return;
        }

        const lastComment = newComment.snippet?.topLevelComment?.snippet as YouTubeComment;

        const title = lastComment.textDisplay.split("").splice(0, 50).join("") + " #bero";

        console.log({ title })

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
    }

    public async execute() {
        await this.updateComment();

        setTimeout(() => {
            this.execute().catch(console.log);
        }, 1000 * 60 * 2);
    }
}

