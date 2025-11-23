import CryptoJS from "crypto-js";

const KEY = process.env.ENCRYPTION_KEY || "ExpensesWalletSecretKey2024";

export const encrypt = (data: any): string => {
  if (!data) return "";
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), KEY).toString();
  } catch (e) {
    console.error("Encryption failed", e);
    return "";
  }
};

export const decrypt = (ciphertext: string): any => {
  if (!ciphertext) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
  } catch (e) {
    console.error("Decryption failed", e);
    return null;
  }
};
