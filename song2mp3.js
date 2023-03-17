const SpotifyWebApi = require('spotify-web-api-node');
const fs = require('fs');
const https = require('https');
const ytdl = require('ytdl-core');
const puppeteer = require('puppeteer');
require('dotenv').config();

async function main() {
    spotifyApi.setAccessToken(await getSpotifyAccessToken());
    // PUT YOUR SPOTIFY TRACK URL HERE
    const spotifyTrackUrl = 'https://open.spotify.com/track/1LYb6PIZO8jcGztOWI6ymM?si=d96f190d8e624467';
    const trackId = spotifyTrackUrl.match(/\/track\/(\w+)/)[1];
    const tracks = await getTrack(trackId)
        .then(async (track) => {
            const youtubeVideoUrl = await getYoutubeVideoUrl(track.trackName, track.artistName);
            await downloadMp3FromVideo(youtubeVideoUrl, `./songs/${track.artistName} - ${track.trackName}.mp3`);
        });
}

// Get the access tokens from Spotify API here => https://developer.spotify.com/dashboard/applications
// Click in "Create an App" then copy the Client ID and Client Secret
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID, // SPOTIFY_CLIENT_ID
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET // SPOTIFY_CLIENT_SECRET
});

async function getTrack(trackId) {
    try {
        const response = await spotifyApi.getTrack(trackId);
        const track = response.body;
        const trackName = track.name;
        const artistName = track.artists[0].name;
        const albumName = track.album.name;
        const imageUrl = track.album.images.length > 0 ? track.album.images[0].url : null;
        return { trackName, artistName, albumName, imageUrl };
    } catch (err) {
        console.error(err);
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
    try {
        const stream = ytdl(url, { filter: 'audioonly' });
        console.log(`Downloading ${audioFilePath} from ${url}`);
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
        });
    } catch (err) {
        console.error(err);
    }
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