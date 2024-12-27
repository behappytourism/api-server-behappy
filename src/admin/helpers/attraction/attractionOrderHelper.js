const { AttractionActivity, AttractionTicket } = require("../../../models");

module.exports = {
    activityCancellationHelper: async ({ activity }) => {
        try {
            console.log(activity);
            const act = await AttractionActivity.findOne({ _id: activity?.activity._id });

            if (!act) {
                throw new Error("activity not found");
            }

            if (activity.bookingType === "ticket") {
                const ticketsData = [
                    ...activity.adultTickets,
                    ...activity.childTickets,
                    ...activity.infantTickets,
                ];

                const tickets = ticketsData.map((ticket) => ({
                    ticketNo: ticket.ticketNo,
                    ticketFor: ticket.ticketFor,
                }));

                await Promise.all(
                    tickets.map(async (ticket) => {
                        const foundTicket = await AttractionTicket.findOne({
                            where: {
                                ticketNo: ticket.ticketNo,
                                ticketFor: ticket.ticketFor,
                            },
                        });

                        if (!foundTicket) {
                            throw new Error(
                                `Ticket not found: ticketNo ${ticket.ticketNo}, ticketFor ${ticket.ticketFor}`
                            );
                        }
                        console.log(`Ticket found:`, foundTicket);
                        await foundTicket.updateOne({ status: "ok" });
                    })
                );

                return true;
            }

            return true;
        } catch (e) {
            console.log(e);
            throw new Error("ticket  not upadted");
        }
    },
};
