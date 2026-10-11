<?php

/**
 * Which proxies in front of the API may be believed about the visitor's real IP address
 * and whether the connection was HTTPS (the X-Forwarded-* headers). Behind a load balancer
 * the app only ever sees the balancer's address; without this, every visitor shares one IP,
 * so the per-IP sign-in rate limit would throttle everyone together and the audit log would
 * record the balancer instead of the person.
 *
 * Comma-separated addresses or CIDR ranges, or "*" to trust whatever connects. The default
 * is the private ranges, which covers an AWS load balancer and Docker's own network. Use
 * "*" only when the API is reachable exclusively through the balancer (security group).
 */
return [
    'trusted' => env('TRUSTED_PROXIES', '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16'),
];
