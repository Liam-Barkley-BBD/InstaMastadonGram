export class Fedify {
    API_BASE_URL = ""; // Set your Express API URL here

    private async makeRequest(
        url: string,
        options: RequestInit = {},
        retryCount = 0,
    ): Promise<any> {
        const defaultHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        const requestOptions: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...(options.headers || {}),
            },
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
        return this.makeRequest(`${this.API_BASE_URL}/users/${handle}/profile`, {}, 0);
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
}
