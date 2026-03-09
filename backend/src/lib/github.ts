import { Octokit } from 'octokit';

/**
 * Create an authenticated Octokit instance for a user's GitHub account.
 */
export function createGitHubClient(accessToken: string): Octokit {
    return new Octokit({ auth: accessToken });
}

/**
 * Create a private repository for the user's gallery storage.
 */
export async function createStorageRepo(accessToken: string, repoName: string = 'gallery-storage') {
    const octokit = createGitHubClient(accessToken);

    // Create private repo
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        private: true,
        description: 'StoreMe — Private media storage repository',
        auto_init: true, // Creates README so we have a default branch
    });

    // Initialize folder structure with placeholder files
    const folders = [
        'gallery/.gitkeep',
        'images/.gitkeep',
        'videos/.gitkeep',
        'index/.gitkeep',
    ];

    for (const folderPath of folders) {
        await octokit.rest.repos.createOrUpdateFileContents({
            owner: repo.owner.login,
            repo: repoName,
            path: folderPath,
            message: `Initialize ${folderPath.split('/')[0]} folder`,
            content: Buffer.from('').toString('base64'),
        });
    }

    return repo;
}

/**
 * Upload a file to the user's GitHub repo.
 */
export async function uploadFileToGitHub(
    accessToken: string,
    owner: string,
    repo: string,
    path: string,
    content: string, // Base64 encoded
    message: string = 'Upload media file'
) {
    const octokit = createGitHubClient(accessToken);

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content,
    });

    return data;
}

/**
 * Delete a file from the user's GitHub repo.
 */
export async function deleteFileFromGitHub(
    accessToken: string,
    owner: string,
    repo: string,
    path: string
) {
    const octokit = createGitHubClient(accessToken);

    // First get the file to obtain its SHA
    const { data: fileData } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
    });

    if (Array.isArray(fileData)) {
        throw new Error('Path is a directory, not a file');
    }

    const { data } = await octokit.rest.repos.deleteFile({
        owner,
        repo,
        path,
        message: `Delete ${path}`,
        sha: fileData.sha,
    });

    return data;
}

/**
 * Get repository info (size, etc).
 */
export async function getRepoInfo(accessToken: string, owner: string, repo: string) {
    const octokit = createGitHubClient(accessToken);

    const { data } = await octokit.rest.repos.get({
        owner,
        repo,
    });

    return {
        size: data.size, // in KB
        full_name: data.full_name,
        private: data.private,
        html_url: data.html_url,
    };
}

/**
 * Get the authenticated GitHub user's info.
 */
export async function getGitHubUser(accessToken: string) {
    const octokit = createGitHubClient(accessToken);

    const { data } = await octokit.rest.users.getAuthenticated();

    return {
        login: data.login,
        id: data.id,
        avatar_url: data.avatar_url,
        name: data.name,
    };
}
