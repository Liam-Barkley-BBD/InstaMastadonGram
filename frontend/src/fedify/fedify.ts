export class Fedify {
    API_BASE_URL = "https://mastodon.social"; // Set your Express API URL here
    fedify_headers = {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Accept-encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    }

    EXPRESS_URL = "http://localhost:8000";

    private async makeRequest(
        url: string,
        options: RequestInit = {},
        retryCount = 0,
        fedifyHeaders?: boolean,
    ): Promise<any> {
        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const requestOptions: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {}),
                ...(fedifyHeaders ? this.fedify_headers : {}),
            }
        };

        try {
            const res = await fetch(url, requestOptions);
            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            return await res.json();
        } catch (error) {
            if (retryCount < 3) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
                return this.makeRequest(url, options, retryCount + 1);
            }
            throw error;
        }
    }

    getLoggedInUser = async () => {
        return this.makeRequest(`${this.API_BASE_URL}/user`, {}, 0);
    };

    getProfile = async (handle: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/${handle}`, {}, 0, true);
    };

    followUser = async (handle: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/${handle}/follow`, {
            method: "POST",
        }, 0);
    };

    unfollowUser = async (handle: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/${handle}/unfollow`, {
            method: "DELETE",
        }, 0);
    };

    searchUsers = async (searchText: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/search?query=${encodeURIComponent(searchText)}`, {}, 0);
    };

    createPost = async (content:string, handle:string) => {
        return this.makeRequest(`${this.EXPRESS_URL}/posts/${handle}`, {
            method: "POST",
            body: JSON.stringify({ content }),
        }, 0, false);
    }
}
