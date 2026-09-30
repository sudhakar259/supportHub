<?php

namespace App\Enums;

enum TicketAssignmentType: string
{
    case Automatic = 'automatic';
    case Manual = 'manual';
    case Reassignment = 'reassignment';
    case RoundRobin = 'round_robin';
    case WorkloadBased = 'workload_based';
}
