const { default: axios } = require("axios");

module.exports = {
    createAppNotififcation: async ({ title, page, body, image, slug }) => {
        try {
            const url = "https://fcm.googleapis.com/fcm/send";
            const response = await axios.post(
                url,
                {
                    to: "/topics/TPITO",
                    notification: {
                        title: title,
                        body: body,
                        image: `${process.env.SERVER_URL}${image}`,
                    },
                    data: {
                        page: page,
                        slug: slug,
                    },
                },
                {
                    headers: {
                        Authorization: `key=${process.env.NOTIFICATION_KEY}`,
                        "Content-Type": "application/json",
                    },
                }
            );
            return response;
        } catch (err) {
            throw err;
        }
    },
};
