<?php

use App\Http\Controllers\PrintController;
use Illuminate\Support\Facades\Route;

// Public — QZ Tray needs the certificate without authentication
Route::get('qz/certificate', [PrintController::class, 'certificate'])->name('qz.certificate');
Route::get('qz/certificate/download', [PrintController::class, 'certificateDownload'])->name('qz.certificate.download');

// Auth-protected — only logged-in users can sign or generate receipts
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('qz/sign', [PrintController::class, 'sign'])->name('qz.sign');
    Route::get('print/receipt/{sale}', [PrintController::class, 'receipt'])->name('print.receipt');
    Route::get('print/return-receipt/{saleReturn}', [PrintController::class, 'returnReceipt'])->name('print.return-receipt');
    Route::get('print/cash-session/{session}', [PrintController::class, 'cashSessionReport'])->name('print.cash-session');
    Route::get('print/test', [PrintController::class, 'test'])->name('print.test');
    Route::get('print/test-template', [PrintController::class, 'testTemplate'])->name('print.test-template');
});
