
### Production 
0. `deno i` to install dependencies
2. make sure to set `.env` vars (note: `NODE_ENV` should be set to `production` in the terminal, not by an `.env` file)
1. run `deno task build` to build frontend 
2. `deno task server:start` to run on port 8000

I suggest putting the deno server behind a reverse proxy and use letsencrypt to get HTTPS
