import basicSsl from "@vitejs/plugin-basic-ssl";

export default {
    plugins: [basicSsl()],
    server: {
        headers: {
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Embedder-Policy": "credentialless",
        },
    },
};
