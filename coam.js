const https = require('https');

const COAM_URL = process.env.COAM_URL || 'https://api.cimpress.io/auth/access-management';

const fetchData = async(url, options) =>{
    return new Promise ((resolve, reject) => {
        https.get(url, options, function(res) {
            let body = '';
            res.on('data', function(chunk) {
                body += chunk;
            });
            res.on('end', function() {
                resolve(body);
            });
        }).on('error', function(e) {
            reject(e);
        });
    });
};

/**
 * Get all COAM permissions granted for a given user
 * @param authToken The Cimpress Auth0 authorization token
 * @param principal The principal authorized in the token
 */
exports.getUserPermissions = async (
    token,
    principal
) =>{
    const url = `${COAM_URL}/v1/principals/${principal}/permissions`;
    try {
        const coamResponse = await fetchData(url, {
            headers: {
                'accept': 'application/json',
                'authorization': `Bearer ${token.replace('Bearer ', '')}`
            }
        });
        return coamResponse;
    }catch(error){
        console.error(error);
    }
    return {};
};

