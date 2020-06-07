import { Component, NgZone, ViewChild, ElementRef, HostListener, Inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';

import { ZXingScannerComponent } from '@zxing/ngx-scanner';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
	_scanner: ZXingScannerComponent;
	devices = [];
	device: any = null;
	closed = true;

	constructor(private updates: SwUpdate,
		private dialog: MatDialog,
		private http: HttpClient) {
		updates.available.subscribe(event => {
      updates.activateUpdate().then(() => {
        document.location.reload();
      });
    });
	}

	@ViewChild('scanner', { static: false }) set scanner(scanner: ZXingScannerComponent) {
		if (!scanner) return;

		console.log(scanner);
		this._scanner = scanner;
	}

	scan(evt) {
		['http://', 'https://'].forEach(prefix => {
			if (evt.substr(0, prefix.length) != prefix) {
				return;
			}

			if (this.closed == false) {
				return;
			}

			this.closed = false;
			this.dialog.open(OpenDomainDialog, { data: evt, width: '70vw' }).afterClosed().subscribe(() => {
				this.closed = true;
			});
		});
	}

	cameras(evt) {
		this.devices = evt;
		this.device = evt[evt.length - 1];
	}

	@HostListener('window:focus', ['$event']) onFocus(event: any): void {
		if (!this._scanner) return;

		this._scanner.enable = true;
	}

	@HostListener('window:blur', ['$event']) onBlur(event: any): void {
		if (!this._scanner) return;

		this._scanner.enable = false;
		this._scanner.reset();
	}
}

@Component({
	template: `
<h1 mat-dialog-title>Scan Complete</h1>
<p mat-dialog-content style="font-size: 130%; padding: 0;">
	{{ domain }}<br/>
	<mat-spinner *ngIf="pos_ready == false"></mat-spinner>
</p>
<div mat-dialog-actions>
	<button (click)="open()" cdkFocusInitial mat-raised-button [disabled]="!pos_ready" color="primary">Upload</button>
	<button (click)="dismiss()" mat-button>Dismiss</button>
</div>
` 
})
export class OpenDomainDialog {
	domain: string;
	pos: any;
	pos_ready = false;

	constructor(@Inject(MAT_DIALOG_DATA) public data: any,
		private ref: MatDialogRef<AppComponent>,
		private zone: NgZone,
		private http: HttpClient) {
		['http://', 'https://'].forEach(prefix => {
			if (data.substr(0, prefix.length) != prefix) {
				return;
			}

			this.domain = data.substr(prefix.length).split('/')[0];
		});

		navigator.geolocation.getCurrentPosition((pos) => {
			this.zone.run(() => {
				this.pos_ready = true;
				this.pos = pos;
			});
		}, err => {
			alert(JSON.stringify(err));
		}, {
			enableHighAccuracy: true,
		});
	}

	open() {
		
		this.http.post('https://secret-qr-api.covidbuddysg.com/data', {
			scanner_id: 1,
			pos: {
				lat: this.pos.coords.latitude,
				lon: this.pos.coords.longitude,
				accuracy: this.pos.coords.accuracy,
			},
			url: this.data,
		}).subscribe(() => {
			this.dismiss();
		}, err => {
			alert('error uploading data');
		});
	}

	dismiss() {
		this.ref.close();
	}
}