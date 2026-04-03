export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                ink: {
                    50: "#f8f7f3",
                    100: "#efebe2",
                    200: "#d8d0c2",
                    300: "#b7ab98",
                    400: "#8e806d",
                    500: "#706250",
                    600: "#5b4f40",
                    700: "#483f34",
                    800: "#342e27",
                    900: "#1f1b17"
                }
            },
            boxShadow: {
                panel: "0 18px 40px rgba(22, 20, 16, 0.08)"
            },
            fontFamily: {
                sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
                serif: ["Lora", "Georgia", "serif"],
                display: ["Cormorant Garamond", "Georgia", "serif"]
            }
        }
    },
    plugins: []
};
