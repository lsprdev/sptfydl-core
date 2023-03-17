const SpotifyWebApi = require('spotify-web-api-node');
const fs = require('fs');
const https = require('https');
const ytdl = require('ytdl-core');
const puppeteer = require('puppeteer');
require('dotenv').config();
const id3 = require('node-id3');

async function main() {
    spotifyApi.setAccessToken(await getSpotifyAccessToken());
    // PUT YOUR SPOTIFY PLAYLIST URL HERE
    const spotifyPlaylistUrl = 'https://open.spotify.com/playlist/28Lwh2aDxOTdk1gFeCNtrI?si=53fe68ba059044d1';
    const playlistId = spotifyPlaylistUrl.match(/\/playlist\/(\w+)/)[1];
    const tracks = await getPlaylistTracks(playlistId);
    console.log(tracks);
}

// Get the access tokens from Spotify API here => https://developer.spotify.com/dashboard/applications
// Click in "Create an App" then copy the Client ID and Client Secret
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID, // SPOTIFY_CLIENT_ID
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET // SPOTIFY_CLIENT_SECRET
});

async function getPlaylistTracks(playlistId) {
        const playlist = await spotifyApi.getPlaylist(playlistId);
        const tracks = playlist.body.tracks.items;
        for (const track of tracks) {
            const trackName = track.track.name;
            const artistName = track.track.artists[0].name;
            const albumName = track.track.album.name;
            const imageUrl = track.track.album.images.length > 0 ? track.track.album.images[0].url : null;
            const youtubeVideoUrl = await getYoutubeVideoUrl(trackName, artistName);
            if (!fs.existsSync(`./songs/${artistName} - ${albumName}`)) {
                fs.mkdirSync(`./songs/${artistName} - ${albumName}`);
            }
            await downloadMp3FromVideo(youtubeVideoUrl, `./songs/${artistName} - ${albumName}/${trackName}.mp3`)
        }
}

async function getYoutubeVideoUrl(trackName, artistName) {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        const searchQuery = `${artistName} - Topic ${trackName}`;
        const url = `https://www.youtube.com/results?search_query=${searchQuery}`;

        await page.goto(url);
        await page.waitForSelector('#contents ytd-video-renderer');

        const firstVideo = await page.$('#contents ytd-video-renderer a#thumbnail');
        const videoUrl = await firstVideo.evaluate(element => element.href);

        await browser.close();
        return videoUrl;
    } catch (err) {
        console.error(err);
    }
}

async function downloadMp3FromVideo(url, audioFilePath) {
    return new Promise((resolve, reject) => {
        try {
            const stream = ytdl(url, { filter: 'audioonly' });
            console.log(`\nDownloading ${audioFilePath} from ${url}`);
            const writeStream = fs.createWriteStream(audioFilePath);
            stream.pipe(writeStream);
            stream.on('progress', (chunkLength, downloaded, total) => {
                const percent = downloaded / total;
                const downloadedMinutes = (downloaded / 1024 / 1024 / 2).toFixed(2);
                const totalMinutes = (total / 1024 / 1024 / 2).toFixed(2);
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                process.stdout.write(`${(percent * 100).toFixed(2)}% downloaded`);
                process.stdout.write(` (${downloadedMinutes}MB of ${totalMinutes}MB)`);
            });
            stream.on('end', () => {
                console.log(`\nAudio downloaded and saved as ${audioFilePath}`);
                resolve();
            });
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
}


async function getSpotifyAccessToken() {
    try {
        const response = await spotifyApi.clientCredentialsGrant();
        const accessToken = response.body.access_token;
        spotifyApi.setAccessToken(accessToken);
        return accessToken;
    } catch (err) {
        console.error(err);
    }
}

main();