import localFont from "next/font/local";

const NOTOSANS_REGULAR = localFont({ 
    src: "../fonts/NotoSans-Regular.ttf", 
    display: "swap" 
});

const NOTOSANS_BOLD = localFont({ 
    src: "../fonts/NotoSans-Bold.ttf", 
    display: "swap" 
});

const NOTOSANS_LIGHT = localFont({ 
    src: "../fonts/NotoSans-Light.ttf", 
    display: "swap" 
});

export const NOTOSANS_REGULAR_CLASS = NOTOSANS_REGULAR.className;
export const NOTOSANS_BOLD_CLASS = NOTOSANS_BOLD.className;
export const NOTOSANS_LIGHT_CLASS = NOTOSANS_LIGHT.className;