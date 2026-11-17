<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Runs only where something calls `php artisan schedule:run` every minute (a
| Railway Cron service in production). Without it nothing breaks: queued blob
| deletions simply wait, and both commands can be run by hand.
*/
Schedule::command('blobs:purge')->hourly()->withoutOverlapping()->onOneServer();
Schedule::command('images:check-links')->dailyAt('03:30')->timezone('America/Bogota')->withoutOverlapping()->onOneServer();
