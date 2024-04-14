
# Stock Returns API

This API provides endpoints to calculate daily returns and alpha for stock tickers using historical price data from IEX Cloud.

## Endpoints

### Get Returns
- **URL:** `/get_return`
- **Method:** `GET`
- **Parameters:**
  - `ticker`: Stock ticker symbol (e.g., AAPL)
  - `from_date` (optional): Start date for the historical data (default: YTD)
  - `to_date` (optional): End date for the historical data (default: current date)
- **Response:** Returns daily returns for the specified ticker within the date range.

### Get Alpha
- **URL:** `/get_alpha`
- **Method:** `GET`
- **Parameters:**
  - `ticker`: Stock ticker symbol
  - `benchmark`: Benchmark stock ticker symbol
  - `from_date` (optional): Start date for the historical data (default: YTD)
  - `to_date` (optional): End date for the historical data (default: current date)
- **Response:** Calculates and returns the alpha of the specified ticker compared to the benchmark over the specified date range.

## How to Use
1.Install visual studio code
2.Open the project
3.install the dependencies
4.start the server(http://localhost:3000/)
5.http://localhost:3000/api to open the swagger API 
