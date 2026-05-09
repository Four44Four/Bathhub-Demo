"use server";

export async function log(msgIn: string) {
    console.log(`[BROWSER]: ${msgIn}`);
}