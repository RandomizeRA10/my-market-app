import * as PlayFab from "playfab-sdk";

// PlayFabのTitleIdを指定
const TITLE_ID = "12F999"; // あなたのPlayFab TitleIdに合わせてください

// 初期化関数
function initPlayFab() {
    if (!PlayFab || !PlayFab.settings) {
        throw new Error("PlayFab SDK が読み込まれていません。npm install と import を確認してください。");
    }
    PlayFab.settings.titleId = TITLE_ID;
}

/**
 * PlayFabのクライアントインベントリ（legacy）を取得
 * @returns {Promise<Array>} アイテム配列
 */
export function getUserInventory() {
    initPlayFab();
    return new Promise((resolve, reject) => {
        PlayFab.PlayFabClient.GetUserInventory({}, (result, error) => {
            if (error && error.errorMessage) {
                console.error("PlayFab Inventory Error:", error);
                return reject(new Error(error.errorMessage));
            }
            if (!result || !result.data) {
                console.error("No inventory data", { result, error });
                return reject(new Error("No inventory data"));
            }
            resolve(result.data.Inventory); // アイテム配列
        });
    });
}