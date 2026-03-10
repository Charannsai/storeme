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
 * Upload multiple files to GitHub in a single commit using the Git Data API.
 * This is vastly more efficient for rate limits and repo history.
 */
export async function uploadFilesBatchToGitHub(
    accessToken: string,
    owner: string,
    repo: string,
    files: Array<{ path: string; content: string }>, // content is Base64 encoded
    message: string = 'Batch upload media files'
) {
    const octokit = createGitHubClient(accessToken);

    // 1. Get current branch reference
    const { data: refData } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: 'heads/main',
    }).catch(async () => {
        // Fallback to master if main doesn't exist
        return octokit.rest.git.getRef({
            owner,
            repo,
            ref: 'heads/master',
        });
    });

    const currentCommitSha = refData.object.sha;

    // 2. Get the commit to get its base tree
    const { data: commitData } = await octokit.rest.git.getCommit({
        owner,
        repo,
        commit_sha: currentCommitSha,
    });

    // 3. Create a tree with the new files
    // The content is passed directly, Octokit handles it if we specify encoding or pass blobs
    // For base64 files, we strictly MUST create blobs FIRST.
    const treeEntries = await Promise.all(
        files.map(async (file) => {
            const { data: blobData } = await octokit.rest.git.createBlob({
                owner,
                repo,
                content: file.content,
                encoding: 'base64',
            });
            return {
                path: file.path,
                mode: '100644' as const,
                type: 'blob' as const,
                sha: blobData.sha,
            };
        })
    );

    const { data: treeData } = await octokit.rest.git.createTree({
        owner,
        repo,
        base_tree: commitData.tree.sha,
        tree: treeEntries,
    });

    // 4. Create the formal commit
    const { data: newCommitData } = await octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: treeData.sha,
        parents: [currentCommitSha],
    });

    // 5. Point the branch pointer to the new commit
    await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: refData.ref.replace('refs/', ''),
        sha: newCommitData.sha,
    });

    return newCommitData;
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

/**
 * Move a file within the GitHub repo (get content → create at new path → delete old).
 */
export async function moveFileInGitHub(
    accessToken: string,
    owner: string,
    repo: string,
    oldPath: string,
    newPath: string,
    message: string = 'Move file'
) {
    const octokit = createGitHubClient(accessToken);

    // 1. Get the file content and SHA
    const { data: fileData } = await octokit.rest.repos.getContent({
        owner, repo, path: oldPath,
    });

    if (Array.isArray(fileData) || !('content' in fileData)) {
        throw new Error('Path is a directory or has no content');
    }

    // 2. Check if the file already exists at the new path
    let newFileSha: string | undefined;
    try {
        const { data: existingData } = await octokit.rest.repos.getContent({
            owner, repo, path: newPath,
        });
        if (!Array.isArray(existingData) && existingData?.sha) {
            newFileSha = existingData.sha;
        }
    } catch (err: any) {
        if (err.status !== 404) {
            throw err;
        }
    }

    // 3. Create file at new path (or update if it already exists)
    await octokit.rest.repos.createOrUpdateFileContents({
        owner, repo, path: newPath,
        message,
        content: fileData.content, // Already base64
        sha: newFileSha,
    });

    // 4. Delete old file
    await octokit.rest.repos.deleteFile({
        owner, repo, path: oldPath,
        message: `${message} (cleanup old path)`,
        sha: fileData.sha,
    });
}

/**
 * List contents of a directory in the GitHub repo.
 * Returns array of items with name, path, type ('file' | 'dir').
 */
export async function listDirectoryInGitHub(
    accessToken: string,
    owner: string,
    repo: string,
    path: string
): Promise<Array<{ name: string; path: string; type: string }>> {
    const octokit = createGitHubClient(accessToken);

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner, repo, path,
        });

        if (!Array.isArray(data)) {
            return []; // Not a directory
        }

        return data.map(item => ({
            name: item.name,
            path: item.path,
            type: item.type, // 'file' or 'dir'
        }));
    } catch (err: any) {
        if (err.status === 404) {
            return []; // Directory doesn't exist yet
        }
        throw err;
    }
}

/**
 * Create a directory in the GitHub repo (via .gitkeep file).
 */
export async function createDirectoryInGitHub(
    accessToken: string,
    owner: string,
    repo: string,
    dirPath: string
) {
    const octokit = createGitHubClient(accessToken);

    await octokit.rest.repos.createOrUpdateFileContents({
        owner, repo,
        path: `${dirPath}/.gitkeep`,
        message: `Create folder ${dirPath}`,
        content: Buffer.from('').toString('base64'),
    });
}
