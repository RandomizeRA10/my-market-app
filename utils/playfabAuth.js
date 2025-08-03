/**
 * PlayFabにメールアドレスとパスワードでログインする関数
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password
 * @returns {Promise<Object>} PlayFab認証情報
 */
export async function loginPlayFab({ email, password }) {
    const url = `https://12F999.playfabapi.com/Client/LoginWithEmailAddress`;
    const body = {
        TitleId: "12F999",
        Email: email,
        Password: password,
        InfoRequestParameters: {
            GetUserAccountInfo: true
        }
    };
    
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });
    
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.errorMessage || "PlayFab認証エラー");
    }
    
    const data = await res.json();
    
    return {
        playFabId: data.data.PlayFabId,
        sessionTicket: data.data.SessionTicket,
        ...data.data
    };
}