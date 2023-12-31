export const renderHTML = ({ imageURL, name, comment }: { imageURL: string, name: string, comment: string }) => {
    const splicedComment = comment.slice(0, 255).concat('...');
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700&display=swap" rel="stylesheet">
            <title>Document</title>
        </head>
        <body>
            <div class="container">
                <div class="content">
                    <div class="flex-column">
                        <div class="user-info">
                            <div class="img-container">
                                <img class="user-img" src="${imageURL}" alt="bero">
                            </div>
                            <div class="user-text-info">
                                <div class="flex">
                                    <h1 class="user-name">
                                        @${name}
                                    </h1>
                                    <h2 class="user-comment-date">
                                        2min
                                    </h2>
                                </div>
                                <h1 class="user-comment">
                                    ${splicedComment}
                                </h1>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        <style>
            html, body, * {
                font-family: 'Roboto', sans-serif;
                padding: 0;
                margin: 0;
                box-sizing: border-box;
            }

            .flex {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .container {
                width: 100vw;
                height: 100vh;
                background: #1D1E26;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
            }

            .spotted-title {
                position: fixed;
                font-size: 10rem;
                color: #FF3131;
                font-weight: 600;
                opacity: 0.3;
            }

            .content {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .flex-column {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }

            .user-info {
                width: 100%;
                height: 100%;
                display: flex;
                justify-content: center;
                align-items: center;
                max-width: 80vw;
            }

            .user-text-info {
                margin-left: 2rem;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: flex-start;
            }

            .img-container {
                width: 15vw;
                height: 15vw;
                min-width: 15vw;
                min-height: 15vw;
                border-radius: 50%;
                overflow: hidden;
                background: #fff;
            }

            .user-img {
                width: 100%;
            }

            .user-name {
                font-size: 4rem;
                color: #fff;
                max-width: 40vw;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .user-comment-date {
                font-size: 3rem;
                color: #fff;
                opacity: 0.5;
                font-weight: 400;
                margin-left: 1rem;
            }

            .user-comment {
                font-size: 3vw;
                color: #fff;
                font-weight: 400;
                margin-top: 1rem;
                word-break: normal;
            }
        </style>
        </html>
    `;
}
