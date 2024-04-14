import 'dotenv/config';
import express from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Client } from '@apperate/iexjs';

const app = express();
app.use(express.json());

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API for stock data',
            version: '1.0.0'
        },
        servers: [{
            url: 'http://localhost:3000/'
        }]
    },
    apis: ['./index.js']
};

const swaggerSpec = swaggerJSDoc(options);

const addAlphaValue = (ticker, benchmark, tickerStockPrices, benchmarkStockPrices) => {
    return tickerStockPrices.map(stockPrice => {
        const temp = {};
        const dateVal = stockPrice.priceDate;
        const val = {};

        val[ticker] = stockPrice;
        val[benchmark] = benchmarkStockPrices.find(benchmarkStockPrice => benchmarkStockPrice.priceDate === dateVal) || {};
        val["alpha-volume"] = val[ticker].volume - val[benchmark].volume;

        temp[dateVal] = val;
        return temp;
    });
};

const calculateRangeDiff = (from, to) => {
    //When timerange is provided
    const fromDate = new Date(from);
    const toDate = new Date(to);

    // Calculate no. of days in the timerange
    const day = 1000 * 60 * 60 * 24;
    const diff = Math.floor(toDate.getTime() - fromDate.getTime());
    return Math.floor(diff / day);
}

app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => {
    res.send('Hello World');
});

/**
 * @swagger
 * /return/{ticker}:
 *         get:
 *             summary: This API returns the ticker info within the timerange provided
 *             description: This API returns the ticker info within the timerange provided
 *             parameters:
 *                  - in: path
 *                    name: ticker
 *                    required: true
 *                    description: Stock Ticker
 *                    schema:
 *                          type: string
 *                  - in: query
 *                    name: from
 *                    required: false
 *                    description: Start Time of the timerange (YYYY-MM-DD)
 *                    schema:
 *                          type: string
 *                  - in: query
 *                    name: to
 *                    required: false
 *                    description: End Time of the timerange (YYYY-MM-DD)
 *                    schema:
 *                          type: string
 *             responses:
 *                  200:
 *                      description: ticker info within the timerange provided
 *                      content: 
 *                          application/json: 
 *                              schema: 
 *                                  type: array
 */

// GET Return
app.get('/return/:ticker', async (req, res) => {
    let response;
    try {

        // Ticker and Time Range values
        const { ticker } = req.params;
        const { from, to } = req.query;

        const client = new Client({ api_token: process.env.API_KEY, version: 'v1' });

        let stockPrices = [], errorMessage = null, status = 200;

        if (!from && !to) {

            // When no timerange is provided, consider the range to be "YTD"
            stockPrices = await client.apperate.queryData({ workspace: "CORE", id: "HISTORICAL_PRICES", key: ticker, range: 'ytd' });

        } else if ((from && !to) || (!from && to)) {

            // Either of From and To Dates are missing

            status = 406;
            errorMessage = "Kindly provide both FROM and TO to obtain values in a range";

        } else {

            const days = calculateRangeDiff(from, to);

            if (days > 30) {

                // Make sure timerange provided is not more than 30 days

                errorMessage = "From and To Dates cannot have difference more than 30 days";
                status = 406;
            } else if (days < 0) {

                // From Date is future of To Date provided

                errorMessage = "From Date cannot be greater than To Date";
                status = 406;

            } else {

                stockPrices = await client.apperate.queryData({ workspace: "CORE", id: "HISTORICAL_PRICES", key: ticker, from: from, to: to });

            }
        }

        // Calculate Daily Returns
        if (Array.isArray(stockPrices)) {
            stockPrices = stockPrices.map((stockPrice => {
                const dailyReturn = Number(parseFloat(stockPrice.close - stockPrice.open).toFixed(2)); // Fix Decimal values to be 2 as Prices cannot be below cents
                const fDailyReturn = Number(parseFloat(stockPrice.fclose - stockPrice.fopen).toFixed(2));
                const uDailyReturn = Number(parseFloat(stockPrice.uclose - stockPrice.uopen).toFixed(2));
                return { ...stockPrice, dailyReturn, uDailyReturn, fDailyReturn };
            }))
        }

        response = {
            status,
            error: errorMessage,
            data: stockPrices
        }
    } catch (error) {

        response = {
            status: 400,
            error: "Something went wrong. Please try again!",
            data: []
        }

    }

    res.send(response);
});

/**
 * @swagger
 * /alpha/{ticker}:
 *         get:
 *             summary: This API returns the ticker info along with the benchmark ticker
 *             description: This API returns the ticker info along with the benchmark ticker
 *             parameters:
 *                  - in: path
 *                    name: ticker
 *                    required: true
 *                    description: Stock Ticker
 *                    schema:
 *                          type: string
 *                  - in: query
 *                    name: benchmark
 *                    required: true
 *                    description: Benchmark Ticker
 *                    schema:
 *                          type: string
 *                  - in: query
 *                    name: from
 *                    required: true
 *                    description: Start Time of the timerange (YYYY-MM-DD)
 *                    schema:
 *                          type: string
 *                  - in: query
 *                    name: to
 *                    required: true
 *                    description: End Time of the timerange (YYYY-MM-DD)
 *                    schema:
 *                          type: string
 *             responses:
 *                  200:
 *                      description: ticker info within the timeframe provided
 *                      content: 
 *                          application/json: 
 *                              schema: 
 *                                  type: array
 */

// GET Alpha
app.get('/alpha/:ticker', async (req, res) => {

    let response;

    try {

        // Ticker, Benchmark and Timerange values
        const { ticker } = req.params;
        const { benchmark, from, to } = req.query;

        const client = new Client({ api_token: process.env.API_KEY, version: 'v1' });

        let stockPrices = [], errorMessage = null, status = 200;

        const days = calculateRangeDiff(from, to);
        if (days < 0) {

            // From Date is future of To Date provided

            errorMessage = "From Date cannot be greater than To Date";
            status = 406;

        } else {

            const tickerStockPrices = await client.apperate.queryData({ workspace: "CORE", id: "HISTORICAL_PRICES", key: ticker, from: from, to: to });
            const benchmarkStockPrices = await client.apperate.queryData({ workspace: "CORE", id: "HISTORICAL_PRICES", key: benchmark, from: from, to: to });

            console.log(benchmarkStockPrices);

            // Calculate aplha value
            stockPrices = addAlphaValue(ticker, benchmark, tickerStockPrices, benchmarkStockPrices);
        }

        response = {
            status,
            error: errorMessage,
            data: stockPrices
        }
    } catch (error) {

        response = {
            status: 400,
            error: "Something went wrong. Please try again!",
            data: []
        }

    }
    res.send(response);
});

app.listen(3000, () => {
    console.log('Server started on port 3000...');
})
