// Custom Typings for Taiko - https://taiko.gauge.org/#/
// Custom type definitions for Taiko 1.0.2

declare module 'taiko' {
    export type TaikoBrowserEvent =
        | 'DOMContentLoaded'
        | 'loadEventFired'
        | 'networkAlmostIdle'
        | 'networkIdle'
        | 'firstPaint'
        | 'firstContentfulPaint'
        | 'firstMeaningfulPaint';

    export interface TaikoBrowserOptions {
        headless?: boolean;
        args?: string[];
        host?: string;
        port?: number;
        ignoreCertificateErrors?: boolean;
        observe?: boolean;
        observeTime?: number;
        dumpio?: boolean;
    }

    export interface TaikoEventOptions {
        waitForEvents?: TaikoBrowserEvent;
    }

    export interface TaikoBasicNavigationOptions {
        waitForNavigation?: boolean;
        navigationTimeout?: number;
    }

    export interface TaikoNavigationOptions extends TaikoBasicNavigationOptions, TaikoEventOptions {
        headers?: Map<string, string>;
        waitForStart?: boolean;
    }

    export interface TaikoClickOptions extends TaikoNavigationOptions {
        button?: 'left' | 'right' | 'middle';
        clickCount?: number;
        elementsToMatch?: number;
    }

    export interface TaikoGlobalConfigurationOptions extends TaikoBasicNavigationOptions {
        observeTime?: number;
        retryInterval?: number;
        retryTimeout?: number;
    }

    export interface TaikoTapOptions extends TaikoBasicNavigationOptions, TaikoEventOptions {}

    export interface TaikoKeyOptions extends TaikoNavigationOptions {
        text?: string;
        delay?: number;
    }

    export interface TaikoWriteOptions extends TaikoNavigationOptions {
        delay?: number;
        hideText?: boolean;
    }

    export interface TaikoSearchElement {
        [key: string]: any;
    }

    export interface TaikoScreenshotOptions {
        path?: string;
        fullPage?: boolean;
        encoding?: string;
    }

    export interface TaikoElementWrapper {
        description: string;
        get(selector: TaikoSearchElement): TaikoElementWrapper;
        text(): string;
        value(): string;
        select(): void;
        check(): void;
        uncheck(): void;
        isChecked(): boolean;
        deselect(): void;
        isSelected(): boolean;
        exists(): boolean;
    }

    export type TaikoInterceptRedirectUrl = string;
    export interface TaikoInterceptMockData {
        [key: string]: any;
    }
    export interface TaikoInterceptRequest {
        continue(url: string):void;
        respond(response: TaikoInterceptMockData):void;
    }
    export type taikoInterceptRequestHandler = (request: TaikoInterceptRequest) => Promise<void>;

    export interface TaikoViewPortScreenOrientation {
        type: 'portraitPrimary' | 'portraitSecondary' | 'landscapePrimary' | 'landscapeSecondary';
        angle: number;
    }
    export interface TaikoViewPort {
        x: number;
        y: number;
        width: number;
        height: number;
        scale: number;
    }
    export interface TaikoViewPortOptions {
        width: number;
        height: number;
        deviceScaleFactor?: number;
        mobile?: boolean;
        scale?: number;
        screenWidth?: number;
        screenHeight?: number;
        positionX?: number;
        positionY?: number;
        dontSetVisibleSize?: boolean;
        screenOrientation?: TaikoViewPortScreenOrientation;
        viewport?: TaikoViewPort;
    }

    export interface TaikoCookieOptions {
        url?: string;
        domain?: string;
        path?: string;
    }

    export interface TaikoCookieDetailOptions extends TaikoCookieOptions {
        secure?: boolean;
        httpOnly?: boolean;
        sameSite?: string;
        expires?: number;
    }

    export interface TaikoLocationOptions {
        latitude: number;
        longitude: number;
        accuracy: number;
    }

    export interface TaikoDragAndDropDistance {
        up: number;
        down: number;
        left: number;
        right: number;
    }

    export interface TaikoMouseCoordinates {
        x: number;
        y: number;
    }

    export interface TaikoProximitySelectorNearOptions {
        offset: number;
    }

    export interface TaikoEvaluateElementOptions {
        [key: string]: any;
    }

    export type Taiko = {
        /**
         * Browser Actions
         **/

        // https://taiko.gauge.org/#openbrowser
        openBrowser(options?: TaikoBrowserOptions): Promise<void>;
        // https://taiko.gauge.org/#closebrowser
        closeBrowser(): Promise<void>;
        // https://taiko.gauge.org/#client
        client(): any; // TODO: no TS Bindings available: https://github.com/cyrus-and/chrome-remote-interface/issues/112
        // https://taiko.gauge.org/#switchto
        switchTo(targetUrl: string): Promise<void>;
        // https://taiko.gauge.org/#intercept
        // https://github.com/getgauge/taiko/issues/98#issuecomment-42024186
        intercept(requestUrl: string, options?: TaikoInterceptMockData | taikoInterceptRequestHandler | TaikoInterceptRedirectUrl): Promise<void>;
        // https://taiko.gauge.org/#emulatenetwork
        emulateNetwork(
            networkType: 'GPRS' | 'Regular2G' | 'Good2G' | 'Good3G' | 'Regular3G' | 'Regular4G' | 'DSL' | 'WiFi, Offline'
        ): Promise<void>;
        // https://taiko.gauge.org/#emulatedevice
        emulateDevice(deviceModel: string):Promise<void>;
        // https://taiko.gauge.org/#setviewport
        setViewPort(options: TaikoViewPortOptions): Promise<void>;
        // https://taiko.gauge.org/#opentab
        openTab(targetUrl: string, options?: TaikoNavigationOptions): Promise<void>;
        // https://taiko.gauge.org/#closetab
        closeTab(targetUrl: string): Promise<void>;
        // https://taiko.gauge.org/#overridepermissions
        overridePermissions(origin: string, permissions: string[]): Promise<void>;
        // https://taiko.gauge.org/#clearpermissionoverrides
        clearPermissionOverrides(): Promise<void>;
        // https://taiko.gauge.org/#setcookie
        setCookie(name: string, value: string, options?: TaikoCookieDetailOptions): Promise<void>;
        // https://taiko.gauge.org/#deletecookies
        deleteCookies(cookieName?: string, options?: TaikoCookieOptions): Promise<void>;
        // https://taiko.gauge.org/#getcookies
        getCookies(options?: { urls: string[] }): Promise<Object[]>;
        // https://taiko.gauge.org/#setlocation
        setLocation(options: TaikoLocationOptions): Promise<void>;

        /**
         * Page Actions
         */

        // https://taiko.gauge.org/#goto
        goto(url: string, options?: TaikoNavigationOptions): Promise<void>;
        // https://taiko.gauge.org/#reload
        reload(url: string, options?: TaikoNavigationOptions): Promise<void>;
        // https://taiko.gauge.org/#goback
        goBack(options?: TaikoNavigationOptions): Promise<void>;
        // https://taiko.gauge.org/#goforward
        goForward(options?: TaikoNavigationOptions): Promise<void>;
        // https://taiko.gauge.org/#title
        title(): Promise<string>;
        // https://taiko.gauge.org/#click
        click(selector: string | TaikoSearchElement, options?: TaikoClickOptions, args?: string[]): Promise<void>;
        // https://taiko.gauge.org/#doubleclick
        doubleClick(selector: string | TaikoSearchElement, options?: TaikoBasicNavigationOptions, args?: string[]): Promise<void>;
        // https://taiko.gauge.org/#rightclick
        rightClick(selector: string | TaikoSearchElement, options?: TaikoBasicNavigationOptions, args?: string[]): Promise<void>;
        // https://taiko.gauge.org/#draganddrop
        dragAndDrop(
            source: string | TaikoSearchElement,
            destination: string | TaikoSearchElement,
            distance: TaikoDragAndDropDistance
        ): Promise<void>;
        // https://taiko.gauge.org/#hover
        hover(selector: string | TaikoSearchElement, options?: TaikoEventOptions): Promise<void>;
        // https://taiko.gauge.org/#focus
        focus(selector: string | TaikoSearchElement, options?: TaikoEventOptions): Promise<void>;
        // https://taiko.gauge.org/#write
        write(text: string, into?: TaikoSearchElement, options?: TaikoWriteOptions): Promise<void>;
        // https://taiko.gauge.org/#clear
        clear(selector: string | TaikoSearchElement, options?: TaikoNavigationOptions): Promise<void>;
        // https://taiko.gauge.org/#attach
        attach(filepath: string, to: string | TaikoSearchElement): Promise<void>;
        // https://taiko.gauge.org/#press
        press(keys: string | string[], options?: TaikoKeyOptions): Promise<void>;
        // https://taiko.gauge.org/#highlight
        highlight(selector: string | TaikoSearchElement): Promise<void>;
        // https://taiko.gauge.org/#mouseaction
        mouseAction(action: string, coordinates: TaikoMouseCoordinates, options?: TaikoNavigationOptions): Promise<void>;
        // https://taiko.gauge.org/#scrollto
        scrollTo(selector: string | TaikoSearchElement, options?: TaikoEventOptions): Promise<void>;
        // https://taiko.gauge.org/#scrollright
        scrollRight(selector?: string | TaikoSearchElement | number, px?: number): Promise<void>;
        // https://taiko.gauge.org/#scrollleft
        scrollLeft(selector?: string | TaikoSearchElement | number, px?: number): Promise<void>;
        // https://taiko.gauge.org/#scrollup
        scrollUp(selector?: string | TaikoSearchElement | number, px?: number): Promise<void>;
        // https://taiko.gauge.org/#scrolldown
        scrollDown(selector?: string | TaikoSearchElement | number, px?: number): Promise<void>;
        // https://taiko.gauge.org/#screenshot
        screenshot(options?: TaikoScreenshotOptions, ...args: TaikoSearchElement[]): Promise<Buffer>;
        // https://taiko.gauge.org/#tap
        tap(selector: string | TaikoSearchElement, options?: TaikoTapOptions, ...args: TaikoSearchElement[]): Promise<void>;

        /**
         * Selectors
         */

        // https://taiko.gauge.org/#dollar
        $(selector: string, ...args: TaikoSearchElement[]): TaikoSearchElement;
        // https://taiko.gauge.org/#image
        image(selector: string | TaikoSearchElement, ...args: TaikoSearchElement[]): TaikoSearchElement;
        // https://taiko.gauge.org/#link
        link(selector: string | TaikoSearchElement, ...args: TaikoSearchElement[]): TaikoSearchElement;
        // https://taiko.gauge.org/#listitem
        listItem(selector: string | TaikoSearchElement, ...args: TaikoSearchElement[]): TaikoSearchElement;
        // https://taiko.gauge.org/#button
        button(selector: string | TaikoSearchElement, ...args: TaikoSearchElement[]): TaikoSearchElement;
        // https://taiko.gauge.org/#inputfield
        inputField(selector: string | TaikoSearchElement, ...args: TaikoSearchElement[]): TaikoElementWrapper;
        // https://taiko.gauge.org/#filefield
        fileField(selector: string | TaikoSearchElement, ...args: TaikoSearchElement[]): TaikoElementWrapper;
        // https://taiko.gauge.org/#textbox
        textBox(selector: string | TaikoSearchElement, ...args: TaikoSearchElement[]): TaikoElementWrapper;
        // https://taiko.gauge.org/#combobox
        comboBox(selector: string | TaikoSearchElement, ...args: TaikoSearchElement[]): TaikoElementWrapper;
        // https://taiko.gauge.org/#dropdown
        dropDown(selector: string | TaikoSearchElement, ...args: TaikoSearchElement[]): TaikoElementWrapper;
        // https://taiko.gauge.org/#checkbox
        checkBox(selector: string | TaikoSearchElement, ...args: TaikoSearchElement[]): TaikoElementWrapper;
        // https://taiko.gauge.org/#radiobutton
        radioButton(selector: string | TaikoSearchElement, ...args: TaikoSearchElement[]): TaikoElementWrapper;
        // https://taiko.gauge.org/#text
        text(selector: string, ...args: TaikoSearchElement[]): TaikoElementWrapper;

        /**
         * Proximity Selectors
         */

        // https://taiko.gauge.org/#toleftof
        toLeftOf(selector: string | TaikoSearchElement | TaikoElementWrapper): TaikoSearchElement;
        // https://taiko.gauge.org/#torightof
        toRightOf(selector: string | TaikoSearchElement | TaikoElementWrapper): TaikoSearchElement;
        // https://taiko.gauge.org/#above
        above(selector: string | TaikoSearchElement | TaikoElementWrapper): TaikoSearchElement;
        // https://taiko.gauge.org/#below
        below(selector: string | TaikoSearchElement | TaikoElementWrapper): TaikoSearchElement;
        // https://taiko.gauge.org/#near
        near(selector: string | TaikoSearchElement | TaikoElementWrapper, opts?: TaikoProximitySelectorNearOptions): TaikoSearchElement;

        /**
         * Events
         */

        // https://taiko.gauge.org/#prompt
        prompt(message: string, callback: Function): void;
        // https://taiko.gauge.org/#confirm
        confirm(message: string, callback: Function): void;
        // https://taiko.gauge.org/#beforeunload
        beforeunload(message: string, callback: Function): void;
        
        /**
         * Helpers
         */

        // https://taiko.gauge.org/#evaluate
        evaluate(
            selector?: string | TaikoSearchElement,
            handlerCallback?: (element: HTMLElement, args?: TaikoEvaluateElementOptions) => Object,
            options?: TaikoNavigationOptions
        ): Promise<Object>;
        // https://taiko.gauge.org/#intervalsecs
        intervalSecs(secs: number): number;
        // https://taiko.gauge.org/#timeoutsecs
        timeoutSecs(secs: number): number;
        // https://taiko.gauge.org/#to
        to(value: string | TaikoSearchElement): string | TaikoSearchElement;
        // https://taiko.gauge.org/#into
        into(value: string | TaikoSearchElement): string | TaikoSearchElement;
        // https://taiko.gauge.org/#accept
        accept(text?: string): Promise<void>;
        // https://taiko.gauge.org/#dismiss
        dismiss(text?: string): Promise<void>;
        // https://taiko.gauge.org/#setconfig
        setConfig(options: TaikoGlobalConfigurationOptions): void;
        // https://taiko.gauge.org/#currenturl
        currentURL(): Promise<string>;
        // https://taiko.gauge.org/#waitfor
        waitFor(time: number): Promise<void>;
        waitFor(element: string, time: number): Promise<void>;
    }
}