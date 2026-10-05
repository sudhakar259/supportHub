<?php

return [

    /*
    | Days a paid subscription stays in past_due after its period ends,
    | before access is suspended.
    */
    'grace_days' => 7,

    /*
    | Days a suspended subscription is kept before it expires. Counted from
    | the end of the grace period, so the full overdue window is grace_days
    | plus this value.
    */
    'expire_after_suspension_days' => 30,

];
