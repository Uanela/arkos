/**
 * Sheu - Terminal color utility class for styling console output
 * Provides chainable methods for colors and text formatting
 */
class Sheu {
  codes: string[];

  constructor() {
    this.codes = [];
  }

  /**
   * Apply text to the current styling codes
   * @param {string} text - The text to style
   * @returns {string} The styled text with ANSI codes
   */
  _apply(text: string): string {
    const openCodes = this.codes.join("");
    return `${openCodes}${text}\x1b[0m`;
  }

  /**
   * Create a new instance with the current codes
   * @returns {Sheu} New Sheu instance
   */
  _chain(): Sheu {
    const newInstance = new Sheu();
    newInstance.codes = [...this.codes];
    return newInstance;
  }

  /**
   * Red color (Tailwind red-500: #ef4444)
   * @param {string} [text] - Optional text to style immediately
   * @returns {string|Sheu} Styled text or chainable instance
   */
  red(text?: string): string | Sheu {
    if (text !== undefined) {
      return `\x1b[31m${text}\x1b[0m`;
    }
    const instance = this._chain();
    instance.codes.push("\x1b[31m");
    return instance;
  }

  /**
   * Blue color (Tailwind blue-500: #3b82f6)
   * @param {string} [text] - Optional text to style immediately
   * @returns {string|Sheu} Styled text or chainable instance
   */
  blue(text?: string): string | Sheu {
    if (text !== undefined) {
      return `\x1b[34m${text}\x1b[0m`;
    }
    const instance = this._chain();
    instance.codes.push("\x1b[34m");
    return instance;
  }

  /**
   * Green color (Tailwind green-500: #22c55e)
   * @param {string} [text] - Optional text to style immediately
   * @returns {string|Sheu} Styled text or chainable instance
   */
  green(text?: string): string | Sheu {
    if (text !== undefined) {
      return `\x1b[32m${text}\x1b[0m`;
    }
    const instance = this._chain();
    instance.codes.push("\x1b[32m");
    return instance;
  }

  /**
   * Yellow color (Tailwind yellow-500: #eab308)
   * @param {string} [text] - Optional text to style immediately
   * @returns {string|Sheu} Styled text or chainable instance
   */
  yellow(text?: string): string | Sheu {
    if (text !== undefined) {
      return `\x1b[33m${text}\x1b[0m`;
    }
    const instance = this._chain();
    instance.codes.push("\x1b[33m");
    return instance;
  }

  /**
   * Cyan color (Tailwind cyan-500: #06b6d4)
   * @param {string} [text] - Optional text to style immediately
   * @returns {string|Sheu} Styled text or chainable instance
   */
  cyan(text?: string): string | Sheu {
    if (text !== undefined) {
      return `\x1b[36m${text}\x1b[0m`;
    }
    const instance = this._chain();
    instance.codes.push("\x1b[36m");
    return instance;
  }

  /**
   * Magenta color (Tailwind fuchsia-500: #d946ef)
   * @param {string} [text] - Optional text to style immediately
   * @returns {string|Sheu} Styled text or chainable instance
   */
  magenta(text?: string): string | Sheu {
    if (text !== undefined) {
      return `\x1b[35m${text}\x1b[0m`;
    }
    const instance = this._chain();
    instance.codes.push("\x1b[35m");
    return instance;
  }

  /**
   * White color (Tailwind white: #ffffff)
   * @param {string} [text] - Optional text to style immediately
   * @returns {string|Sheu} Styled text or chainable instance
   */
  white(text?: string): string | Sheu {
    if (text !== undefined) {
      return `\x1b[37m${text}\x1b[0m`;
    }
    const instance = this._chain();
    instance.codes.push("\x1b[37m");
    return instance;
  }

  /**
   * Black color (Tailwind black: #000000)
   * @param {string} [text] - Optional text to style immediately
   * @returns {string|Sheu} Styled text or chainable instance
   */
  black(text?: string): string | Sheu {
    if (text !== undefined) {
      return `\x1b[30m${text}\x1b[0m`;
    }
    const instance = this._chain();
    instance.codes.push("\x1b[30m");
    return instance;
  }

  /**
   * Gray color (Tailwind gray-500: #6b7280)
   * @param {string} [text] - Optional text to style immediately
   * @returns {string|Sheu} Styled text or chainable instance
   */
  gray(text?: string): string | Sheu {
    if (text !== undefined) {
      return `\x1b[90m${text}\x1b[0m`;
    }
    const instance = this._chain();
    instance.codes.push("\x1b[90m");
    return instance;
  }

  /**
   * Orange color (Tailwind orange-500: #f97316)
   * @param {string} [text] - Optional text to style immediately
   * @returns {string|Sheu} Styled text or chainable instance
   */
  orange(text?: string): string | Sheu {
    if (text !== undefined) {
      return `\x1b[91m${text}\x1b[0m`;
    }
    const instance = this._chain();
    instance.codes.push("\x1b[91m");
    return instance;
  }

  /**
   * Bold text formatting
   * @param {string} [text] - Optional text to style immediately
   * @returns {string|Sheu} Styled text or chainable instance
   */
  bold(text?: string): string | Sheu {
    if (text !== undefined) {
      return `\x1b[1m${text}\x1b[0m`;
    }
    const instance = this._chain();
    instance.codes.push("\x1b[1m");
    return instance;
  }

  /**
   * Apply all accumulated styles to text
   * @param {string} text - The text to style
   * @returns {string} The styled text
   */
  apply(text: string): string {
    return this._apply(text);
  }

  /**
   * Info label with cyan color [INFO]
   * @param {string} [message] - Optional message to append
   * @returns {string} Formatted info label
   */
  info(message?: string): string {
    const label = `[\x1b[36mINFO\x1b[0m]`;
    const content = message ? `${label} ${message}` : label;
    console.info(content);
    return content;
  }

  /**
   * Error label with red color [ERROR]
   * @param {string} [message] - Optional message to append
   * @returns {string} Formatted error label
   */
  error(message?: string): string {
    const label = `[\x1b[31mERROR\x1b[0m]`;
    const content = message ? `${label} ${message}` : label;
    console.info(content);
    return content;
  }

  /**
   * Ready label with green color [READY]
   * @param {string} [message] - Optional message to append
   * @returns {string} Formatted ready label
   */
  ready(message?: string): string {
    const label = `[\x1b[32mREADY\x1b[0m]`;
    const content = message ? `${label} ${message}` : label;
    console.info(content);
    return content;
  }

  /**
   * Done label with green color [DONE]
   * @param {string} [message] - Optional message to append
   * @returns {string} Formatted done label
   */
  done(message?: string): string {
    const label = `[\x1b[32mDONE\x1b[0m]`;
    const content = message ? `${label} ${message}` : label;
    console.info(content);
    return content;
  }

  /**
   * Warning label with yellow color [WARN]
   * @param {string} [message] - Optional message to append
   * @returns void
   */
  warn(message?: string) {
    const label = `[\x1b[33mWARN\x1b[0m]`;
    console.info(message ? `${label} ${message}` : label);
  }
}

// Create default instance
const sheu = new Sheu();

// Add static methods to the default instance for direct usage
Object.getOwnPropertyNames(Sheu.prototype).forEach((method) => {
  if (method !== "constructor" && method !== "_apply" && method !== "_chain") {
    (sheu as any)[method] = Sheu.prototype[method as keyof Object].bind(
      new Sheu()
    );
  }
});

export default sheu;
