import * as core from "@actions/core";
import * as github from "@actions/github";
import * as io from "@actions/io";
import * as os from "os";
import * as fs from "fs";
import * as request from "request";
import zip from "jszip";
import path from "path";

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
                ? `https://github.com/ninja-build/ninja/releases/latest/download/ninja-${platform}.zip`
                : `https://github.com/ninja-build/ninja/releases/download/v${version}/ninja-${platform}.zip`;
        core.debug(`platform: ${platform}`);
        core.debug(`url: ${url}`);

        let filename = "ninja";
        if (os.platform() === "win32")
        {
            filename = `${filename}.exe`;
        }

        const destionation = "bin";
        await io.mkdirP(destionation);

        const filepath = path.join(destionation, filename);
        const buffer = await downloadAsBuffer(url);
        const archive = await zip.loadAsync(buffer);
        const binary = archive.files[filename];
        if (binary)
        {
            const content = await binary.async("nodebuffer");
            fs.writeFileSync(filepath, content);
            core.info(`File \"${filepath}\" has been written successfully`);
        }
        else
        {
            throw new Error(`Could not found "${filename}" in the downloaded file!`);
        }

        fs.chmodSync(filepath, "755");
        core.info(`Successfully installed Ninja ${version}`);

        core.addPath(destionation);
        core.info(`Successfully added Ninja to PATH`);
    }
    catch (error)
    {
        core.setFailed(error.message);
    }
}

run();
