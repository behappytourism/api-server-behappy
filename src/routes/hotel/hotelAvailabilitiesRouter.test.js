const supertest = require("supertest");

const { app } = require("../../../index.js");

describe("Get Single Hotel availability", () => {
    let request = null;
    let jwtToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2M2QzYmIzMDBhYmNjYzMzMzBjN2UzOWEiLCJlbWFpbCI6Im5paGFsQGhhbWkubGl2ZSIsImlhdCI6MTY5ODc1NDQ4NCwiZXhwIjoxNjk5MzU5Mjg0fQ.VIBjAx0zbZgVEQe1Y0mRq4K3VdoEoJZrliNIN__oudI";

    beforeAll(function (done) {
        app.listen(done);
        request = supertest.agent(app);
    });

    // Royal Falcon Hotel Id
    let checkInDate = "";
    let checkOutDate = "";
    const hotelId = "644cf3d4ebecaa0acb9acf16";
    const headers = {
        Authorization: "Bearer " + jwtToken,
    };
    const body = {
        fromDate: checkInDate
            ? checkInDate
            : new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().substring(0, 10),
        toDate: checkOutDate
            ? checkOutDate
            : new Date(new Date().setDate(new Date().getDate() + 4)).toISOString().substring(0, 10),
        rooms: [
            {
                noOfAdults: 1,
                noOfChildren: 0,
                childrenAges: [],
            },
        ],
        hotelId,
    };

    var Difference_In_Time = new Date(body.toDate).getTime() - new Date(body.fromDate).getTime();

    var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
    const noOfNights = Difference_In_Days;

    it("It should be authorized", (done) => {
        request
            .post("/api/v1/b2b/hotels/availabilities/single/search")
            .send(body)
            .expect(401)
            .end((err, res) => {
                if (err) return done(err);
                done();
            });
    });

    it("It return single hotel availability response", (done) => {
        request
            .post("/api/v1/b2b/hotels/availabilities/single/search")
            .set(headers)
            .send(body)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);

                const response = JSON.parse(res?.text);

                // match checkIn and CheckOut Date
                expect(new Date(response?.fromDate).toISOString().substring(0, 10))?.toEqual(
                    body.fromDate
                );
                expect(new Date(response?.toDate).toISOString().substring(0, 10))?.toEqual(
                    body.toDate
                );
                expect(response?.noOfNights).toEqual(noOfNights);

                console.log(response);

                done();
            });
    });
});
