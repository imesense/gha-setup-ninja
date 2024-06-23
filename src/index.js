import * as core from "@actions/core";
import * as github from "@actions/github";
import * as os from "os";
import * as fs from "fs";
import * as request from "request";
import zip from "jszip";

function getPlatform()
{
    const platform = os.platform();
    switch (platform)
    {
        case "win32":
            return "win";
        case "linux":
            return "linux";
        case "darwin":
            return "mac";
        default:
            throw new Error(`Not supported platform!`);
    }
}

async function downloadAsBuffer(url)
{
    return new Promise((resolve, reject) =>
    {
        console.log(`Downloading file ${url}`);
        request.get({ url, encoding: null }, (error, responce, body) =>
        {
            if (error)
            {
                reject(error);
                return;
            }

            console.log(`Recieved ${responce.statusCode}`);
            if (responce.statusCode >= 400)
            {
                reject(new Error(`Recieved ${responce.statusCode} from ${url}`));
            }
            else
            {
                console.log(`Download complete`);
                resolve(body);
            }
        });
    });
}

async function run()
{
    try
    {
        const version = core.getInput("version");
        core.debug(`version: ${version}`);

        const platform = getPlatform().toString();
        const url =
            version === "latest"
                ? "https://github.com/ninja-build/ninja/releases/latest/download/ninja-${platform}.zip"
                : `https://github.com/ninja-build/ninja/releases/download/v${version}/ninja-${platform}.zip`;
        core.debug(`platform: ${platform}`);
        core.debug(`url: ${url}`);

        let filename = "ninja";
        if (os.platform() === "win32")
        {
            filename = `${filename}.exe`;
        }

        const buffer = await downloadAsBuffer(url);
        const archive = await zip.loadAsync(buffer);
        const binary = archive.files[filename];
        if (binary)
        {
            const content = await binary.async("nodebuffer");
            fs.writeFileSync(filename, content);
            console.log(`File ${filename} has been written successfully`);
        }
        else
        {
            throw new Error(`Could not found "${filename}" in the downloaded file!`);
        }

        fs.chmodSync(filename, "755");
        core.info(`Successfully installed Ninja ${version}`);

        core.addPath(__dirname);
        core.info(`Successfully added Ninja to PATH`);

        const payload = JSON.stringify(github.context.payload, undefined, 2);
        console.debug(`Event payload: ${payload}`);
    }
    catch (error)
    {
        core.setFailed(error.message);
    }
}

run();
