export class Fedify {
    API_BASE_URL = ""; // Change to your server URL

    private async makeRequest(url: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
        const defaultHeaders = {
            'Content-Type': 'application/activity+json',
            'Accept': 'application/activity+json, application/ld+json; profile=""',
        };

        const requestOptions: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
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
        return this.makeRequest(`${this.API_BASE_URL}/user`);
    };

    getProfile = async (handle: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/${handle}/profile`);
    };

    followUser = async (handle: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/${handle}/follow`, {
            method: "POST",
        });
    };

    unfollowUser = async (handle: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/${handle}/unfollow`, {
            method: "DELETE",
        });
    };

    searchUsers = async (searchText: string) => {
        return this.makeRequest(`${this.API_BASE_URL}/users/search?query=${encodeURIComponent(searchText)}`);
    };
}