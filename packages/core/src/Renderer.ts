import { isWebGLSupported, deprecation } from '@pixi/utils';
import { MaskSystem } from './mask/MaskSystem';
import { StencilSystem } from './mask/StencilSystem';
import { ScissorSystem } from './mask/ScissorSystem';
import { FilterSystem } from './filters/FilterSystem';
import { FramebufferSystem } from './framebuffer/FramebufferSystem';
import { RenderTextureSystem } from './renderTexture/RenderTextureSystem';
import { TextureSystem } from './textures/TextureSystem';
import { ProjectionSystem } from './projection/ProjectionSystem';
import { StateSystem } from './state/StateSystem';
import { GeometrySystem } from './geometry/GeometrySystem';
import { ShaderSystem } from './shader/ShaderSystem';
import { ContextSystem } from './context/ContextSystem';
import { BatchSystem } from './batch/BatchSystem';
import { TextureGCSystem } from './textures/TextureGCSystem';
import { MSAA_QUALITY, RENDERER_TYPE } from '@pixi/constants';
import { UniformGroup } from './shader/UniformGroup';
import { Matrix, Rectangle } from '@pixi/math';
import { BufferSystem } from './geometry/BufferSystem';
import { RenderTexture } from './renderTexture/RenderTexture';

import type { SCALE_MODES } from '@pixi/constants';

import { IRendererPluginConstructor, IRendererPlugins, PluginSystem } from './plugin/PluginSystem';
import { MultisampleSystem } from './framebuffer/MultisampleSystem';
import { GenerateTextureSystem, IGenerateTextureOptions } from './renderTexture/GenerateTextureSystem';
import { BackgroundSystem } from './background/BackgroundSystem';
import { ViewSystem } from './view/ViewSystem';
import { RendererSystem } from './render/RenderSystem';
import { settings } from '@pixi/settings';
import { SystemManager } from './system/SystemManager';
import { IRenderableObject, IRenderer, IRendererOptions, IRendererRenderOptions, IRenderingContext } from './IRenderer';
import { StartupOptions, StartupSystem } from './startup/StartupSystem';

/**
 * The Renderer draws the scene and all its content onto a WebGL enabled canvas.
 *
 * This renderer should be used for browsers that support WebGL.
 *
 * This renderer works by automatically managing WebGLBatches, so no need for Sprite Batches or Sprite Clouds.
 * Don't forget to add the view to your DOM or you will not see anything!
 *
 * Renderer is composed of systems that manage specific tasks. The following systems are added by default
 * whenever you create a renderer:
 *
 * | System                               | Description                                                                   |
 * | ------------------------------------ | ----------------------------------------------------------------------------- |

 * | Generic Systems                      | Systems that manage functionality that all renderer types share               |
 * | ------------------------------------ | ----------------------------------------------------------------------------- |
 * | {@link PIXI.ViewSystem}              | This manages the main view of the renderer usually a Canvas                   |
 * | {@link PIXI.PluginSystem}            | This manages plugins for the renderer                                         |
 * | {@link PIXI.BackgroundSystem}        | This manages the main views background color and alpha                        |
 * | {@link PIXI.StartupSystem}           | Boots up a renderer and initiatives all the systems                           |
 * | {@link PIXI.EventSystem}             | This manages UI events.                                                       |

 * | WebGL Core Systems                   | Provide an optimised, easy to use API to work with WebGL                      |
 * | ------------------------------------ | ----------------------------------------------------------------------------- |
 * | {@link PIXI.ContextSystem}           | This manages the WebGL context and extensions.                                |
 * | {@link PIXI.FramebufferSystem}       | This manages framebuffers, which are used for offscreen rendering.            |
 * | {@link PIXI.GeometrySystem}          | This manages geometries & buffers, which are used to draw object meshes.      |
 * | {@link PIXI.ShaderSystem}            | This manages shaders, programs that run on the GPU to calculate 'em pixels.   |
 * | {@link PIXI.StateSystem}             | This manages the WebGL state variables like blend mode, depth testing, etc.   |
 * | {@link PIXI.TextureSystem}           | This manages textures and their resources on the GPU.                         |
 * | {@link PIXI.TextureGCSystem}         | This will automatically remove textures from the GPU if they are not used.    |
 * | {@link PIXI.MultisampleSystem}       | This manages the multisample const on the WEbGL Renderer                      |

 * | Pixi high level Systems              | Set of Pixi specific systems designed to work with Pixi objects               |
 * | ------------------------------------ | ----------------------------------------------------------------------------- |
 * | {@link PIXI.RenderSystem}          | This adds the ability to render a PIXI.DisplayObject                          |
 * | {@link PIXI.GenerateTextureSystem}   | This adds the ability to generate textures from any PIXI.DisplayObject        |
 * | {@link PIXI.ProjectionSystem}        | This manages the `projectionMatrix`, used by shaders to get NDC coordinates.  |
 * | {@link PIXI.RenderTextureSystem}     | This manages render-textures, which are an abstraction over framebuffers.     |
 * | {@link PIXI.MaskSystem}              | This manages masking operations.                                              |
 * | {@link PIXI.ScissorSystem}           | This handles scissor masking, and is used internally by {@link MaskSystem}    |
 * | {@link PIXI.StencilSystem}           | This handles stencil masking, and is used internally by {@link MaskSystem}    |
 * | {@link PIXI.FilterSystem}            | This manages the filtering pipeline for post-processing effects.              |
 * | {@link PIXI.BatchSystem}             | This manages object renderers that defer rendering until a flush.             |
 *
 * The breadth of the API surface provided by the renderer is contained within these systems.
 *
 * @class
 * @memberof PIXI
 * @implements PIXI.IRenderer
 */
export class Renderer extends SystemManager<Renderer> implements IRenderer
{
    /**
     * The type of the renderer. will be PIXI.RENDERER_TYPE.CANVAS
     *
     * @member {number}

     * @see PIXI.RENDERER_TYPE
     */
    public readonly type: RENDERER_TYPE.WEBGL;

    /**
     * WebGL context, set by {@link PIXI.ContextSystem this.context}.
     *
     * @readonly
     * @member {WebGLRenderingContext}
     */
    public gl: IRenderingContext;

    /**
     * Global uniforms
     * Add any uniforms you want shared across your shaders.
     * the must be added before the scene is rendered for the first time
     * as we dynamically buildcode to handle all global var per shader
     *
     * */
    public globalUniforms: UniformGroup;

    /** Unique UID assigned to the renderer's WebGL context. */
    public CONTEXT_UID: number;

    // systems

    /**
     * Mask system instance
     * @readonly
     */
    public readonly mask: MaskSystem;

    /**
     * Context system instance
     * @readonly
     */
    public readonly context: ContextSystem;

    /**
     * State system instance
     * @readonly
     */
    public readonly state: StateSystem;

    /**
     * Shader system instance
     * @readonly
     */
    public readonly shader: ShaderSystem;

    /**
     * Texture system instance
     * @readonly
     */
    public readonly texture: TextureSystem;

    /**
     * Buffer system instance
     * @readonly
     */
    public readonly buffer: BufferSystem;

    /**
     * Geometry system instance
     * @readonly
     */
    public readonly geometry: GeometrySystem;

    /**
     * Framebuffer system instance
     * @readonly
     */
    public readonly framebuffer: FramebufferSystem;

    /**
     * Scissor system instance
     * @readonly
     */
    public readonly scissor: ScissorSystem;

    /**
     * Stencil system instance
     * @readonly
     */
    public readonly stencil: StencilSystem;

    /**
     * Projection system instance
     * @readonly
     */
    public readonly projection: ProjectionSystem;

    /**
     * Texture garbage collector system instance
     * @readonly
     */
    public readonly textureGC: TextureGCSystem;

    /**
     * Filter system instance
     * @readonly
     */
    public readonly filter: FilterSystem;

    /**
     * RenderTexture system instance
     * @readonly
     */
    public readonly renderTexture: RenderTextureSystem;

    /**
     * Batch system instance
     * @readonly
     */
    public readonly batch: BatchSystem;

    /**
     * plugin system instance
     * @readonly
     */
    public readonly _plugin: PluginSystem;

    /**
     * _multisample system instance
     * @readonly
     */
    public readonly _multisample: MultisampleSystem;

    /**
     * textureGenerator system instance
     * @readonly
     */
    public readonly textureGenerator: GenerateTextureSystem;

    /**
     * background system instance
     * @readonly
     */
    public readonly background: BackgroundSystem;

    /**
     * _view system instance
     * @readonly
     */
    public readonly _view: ViewSystem;

    /**
     * _render system instance
     * @readonly
     */
    public readonly _render: RendererSystem;

    /**
     * startup system instance
     * @readonly
     */
    public readonly startup: StartupSystem;

    /**
     * Internal signal instances of **runner**, these
     * are assigned to each system created.
     * @see PIXI.Runner
     * @name runners
     * @private
     * @type {object}
     * @readonly
     * @property {PIXI.Runner} destroy - Destroy runner
     * @property {PIXI.Runner} contextChange - Context change runner
     * @property {PIXI.Runner} reset - Reset runner
     * @property {PIXI.Runner} update - Update runner
     * @property {PIXI.Runner} postrender - Post-render runner
     * @property {PIXI.Runner} prerender - Pre-render runner
     * @property {PIXI.Runner} resize - Resize runner
     */

    /**
     * Create renderer if WebGL is available. Overrideable
     * by the **@pixi/canvas-renderer** package to allow fallback.
     * throws error if WebGL is not available.
     *
     * @private
     */
    static create(options?: IRendererOptions): IRenderer
    {
        if (isWebGLSupported())
        {
            return new Renderer(options);
        }

        throw new Error('WebGL unsupported in this browser, use "pixi.js-legacy" for fallback canvas2d support.');
    }

    /**
     * @param [options] - The optional renderer parameters.
     * @param {number} [options.width=800] - The width of the screen.
     * @param {number} [options.height=600] - The height of the screen.
     * @param {HTMLCanvasElement} [options.view] - The canvas to use as a view, optional.
     * @param {boolean} [options.useContextAlpha=true] - Pass-through value for canvas' context `alpha` property.
     *   If you want to set transparency, please use `backgroundAlpha`. This option is for cases where the
     *   canvas needs to be opaque, possibly for performance reasons on some older devices.
     * @param {boolean} [options.autoDensity=false] - Resizes renderer view in CSS pixels to allow for
     *   resolutions other than 1.
     * @param {boolean} [options.antialias=false] - Sets antialias. If not available natively then FXAA
     *  antialiasing is used.
     * @param {number} [options.resolution=PIXI.settings.RESOLUTION] - The resolution / device pixel ratio of the renderer.
     * @param {boolean} [options.clearBeforeRender=true] - This sets if the renderer will clear
     *  the canvas or not before the new render pass. If you wish to set this to false, you *must* set
     *  preserveDrawingBuffer to `true`.
     * @param {boolean} [options.preserveDrawingBuffer=false] - Enables drawing buffer preservation,
     *  enable this if you need to call toDataUrl on the WebGL context.
     * @param {number} [options.backgroundColor=0x000000] - The background color of the rendered area
     *  (shown if not transparent).
     * @param {number} [options.backgroundAlpha=1] - Value from 0 (fully transparent) to 1 (fully opaque).
     * @param {string} [options.powerPreference] - Parameter passed to WebGL context, set to "high-performance"
     *  for devices with dual graphics card.
     * @param {object} [options.context] - If WebGL context already exists, all parameters must be taken from it.
     */
    constructor(options? : IRendererOptions)
    {
        super();

        // Add the default render options
        options = Object.assign({}, settings.RENDER_OPTIONS, options);

        this.gl = null;

        this.CONTEXT_UID = 0;

        this.globalUniforms = new UniformGroup({
            projectionMatrix: new Matrix(),
        }, true);

        const systemConfig = {
            runners: ['init', 'destroy', 'contextChange', 'reset', 'update', 'postrender', 'prerender', 'resize'],
            systems: {
                // systems shared by all renderers..
                textureGenerator: GenerateTextureSystem,
                background: BackgroundSystem,
                _view: ViewSystem,
                _plugin: PluginSystem,
                startup: StartupSystem,

                // low level WebGL systems
                context: ContextSystem,
                state: StateSystem,
                shader: ShaderSystem,
                texture: TextureSystem,
                buffer: BufferSystem,
                geometry: GeometrySystem,
                framebuffer: FramebufferSystem,

                // high level pixi specific rendering
                mask: MaskSystem,
                scissor: ScissorSystem,
                stencil: StencilSystem,
                projection: ProjectionSystem,
                textureGC: TextureGCSystem,
                filter: FilterSystem,
                renderTexture: RenderTextureSystem,
                batch: BatchSystem,
                _multisample: MultisampleSystem,
                _render: RendererSystem,
            }
        };

        this.setup(systemConfig);

        // new options!
        const startupOptions: StartupOptions = {
            _plugin: Renderer.__plugins,
            background: {
                backgroundAlpha: options.backgroundAlpha,
                backgroundColor: options.backgroundColor,
                clearBeforeRender: options.clearBeforeRender,
                transparent: options.transparent,
            },
            _view: {
                height: options.height,
                width: options.width,
                autoDensity: options.autoDensity,
                resolution: options.resolution,
                view: options.view,
            },
            context: {
                antialias: options.antialias,
                context: options.context,
                powerPreference: options.powerPreference,
                premultipliedAlpha: options.premultipliedAlpha
                ?? (options.useContextAlpha && options.useContextAlpha !== 'notMultiplied'),
                preserveDrawingBuffer: options.preserveDrawingBuffer,
            },
        };

        this.startup.run(startupOptions);
    }

    /**
     * Renders the object to its WebGL view.
     *
     * @param displayObject - The object to be rendered.
     * @param {object} [options] - Object to use for render options.
     * @param {PIXI.RenderTexture} [options.renderTexture] - The render texture to render to.
     * @param {boolean} [options.clear=true] - Should the canvas be cleared before the new render.
     * @param {PIXI.Matrix} [options.transform] - A transform to apply to the render texture before rendering.
     * @param {boolean} [options.skipUpdateTransform=false] - Should we skip the update transform pass?
     */
    render(displayObject: IRenderableObject, options?: IRendererRenderOptions): void;

    /**
     * Please use the `option` render arguments instead.
     *
     * @deprecated Since 6.0.0
     * @param displayObject
     * @param renderTexture
     * @param clear
     * @param transform
     * @param skipUpdateTransform
     */
    render(displayObject: IRenderableObject, renderTexture?: RenderTexture,
        clear?: boolean, transform?: Matrix, skipUpdateTransform?: boolean): void;

    /**
     * @ignore
     */
    render(displayObject: IRenderableObject, options?: IRendererRenderOptions | RenderTexture): void
    {
        if (options instanceof RenderTexture)
        {
            // #if _DEBUG
            deprecation('6.0.0', 'Renderer#render arguments changed, use options instead.');
            // #endif

            /* eslint-disable prefer-rest-params */
            options = {
                renderTexture: options,
                clear: arguments[2],
                transform: arguments[3],
                skipUpdateTransform: arguments[4]
            };
            /* eslint-enable prefer-rest-params */
        }

        this._render.render(displayObject, options);
    }

    /**
     * Resizes the WebGL view to the specified width and height.
     *
     * @param desiredScreenWidth - The desired width of the screen.
     * @param desiredScreenHeight - The desired height of the screen.
     */
    resize(desiredScreenWidth: number, desiredScreenHeight: number): void
    {
        this._view.resizeView(desiredScreenWidth, desiredScreenHeight);
    }

    /**
     * Resets the WebGL state so you can render things however you fancy!
     *
     * @return Returns itself.
     */
    reset(): this
    {
        this.runners.reset.emit();

        return this;
    }

    /** Clear the frame buffer. */
    clear(): void
    {
        this.renderTexture.bind();
        this.renderTexture.clear();
    }

    /**
     * Removes everything from the renderer (event listeners, spritebatch, etc...)
     *
     * @param [removeView=false] - Removes the Canvas element from the DOM.
     *  See: https://github.com/pixijs/pixi.js/issues/2233
     */
    destroy(removeView = false): void
    {
        this.runners.destroy.items.reverse();

        this.emitWithCustomOptions(this.runners.destroy, {
            _view: removeView,
        });

        super.destroy();
    }

    /**
     * Please use `plugins.extract` instead.
     * @member {PIXI.Extract} extract
     * @deprecated since 6.0.0
     * @readonly
     */
    public get extract(): any
    {
        // #if _DEBUG
        deprecation('6.0.0', 'Renderer#extract has been deprecated, please use Renderer#plugins.extract instead.');
        // #endif

        return this.plugins.extract;
    }

    /** Collection of plugins */
    get plugins(): IRendererPlugins
    {
        return this._plugin.plugins;
    }

    /** The number of msaa samples of the canvas. */
    get multisample(): MSAA_QUALITY
    {
        return this._multisample.multisample;
    }

    /**
     * Same as view.width, actual number of pixels in the canvas by horizontal.
     *
     * @member {number}
     * @readonly
     * @default 800
     */
    get width(): number
    {
        return this._view.view.width;
    }

    /**
     * Same as view.height, actual number of pixels in the canvas by vertical.
     * @default 600
     */
    get height(): number
    {
        return this._view.view.height;
    }

    /** The resolution / device pixel ratio of the renderer. */
    get resolution(): number
    {
        return this._view.resolution;
    }

    /** Whether CSS dimensions of canvas view should be resized to screen dimensions automatically. */
    get autoDensity(): boolean
    {
        return this._view.autoDensity;
    }

    /** The canvas element that everything is drawn to.*/
    get view(): HTMLCanvasElement
    {
        return this._view.view;
    }

    /**
     * Measurements of the screen. (0, 0, screenWidth, screenHeight).
     *
     * Its safe to use as filterArea or hitArea for the whole stage.
     *
     * @member {PIXI.Rectangle}
     */
    get screen(): Rectangle
    {
        return this._view.screen;
    }

    /** the last object rendered by the renderer. Useful for other plugins like interaction managers */
    get lastObjectRendered(): IRenderableObject
    {
        return this._render.lastObjectRendered;
    }

    /** Flag if we are rendering to the screen vs renderTexture */
    get renderingToScreen(): boolean
    {
        return this._render.renderingToScreen;
    }

    /** When logging Pixi to the console, this is the name we will show */
    get rendererLogId(): string
    {
        return `WebGL ${this.context.webGLVersion}`;
    }

    /**
     * this sets weather the screen is totally cleared between each frame withthe background color and alpha
     */
    get clearBeforeRender(): boolean
    {
        // eslint-disable-next-line max-len
        deprecation('6.1.0', 'Renderer#useContextAlpha has been deprecated, please use Renderer#background.clearBeforeRender instead.');

        return this.background.clearBeforeRender;
    }

    /**
     * Pass-thru setting for the canvas' context `alpha` property. This is typically
     * not something you need to fiddle with. If you want transparency, use `backgroundAlpha`.
     *
     * @member {boolean}
     */
    get useContextAlpha(): boolean | 'notMultiplied'
    {
        // eslint-disable-next-line max-len
        deprecation('6.2.0', 'Renderer#useContextAlpha has been deprecated, please use Renderer#context.premultipliedAlpha instead.');

        return this.context.useContextAlpha;
    }

    /**
     * readonly drawing buffer preservation
     * we can only know this if Pixi created the context
     *
     * @deprecated since 6.2.0
     */
    get preserveDrawingBuffer(): boolean
    {
        // eslint-disable-next-line max-len
        deprecation('6.2.0', 'Renderer#preserveDrawingBuffer has been deprecated, we cannot truly know this unless pixi created the context');

        return this.context.preserveDrawingBuffer;
    }

    /**
     * Useful function that returns a texture of the display object that can then be used to create sprites
     * This can be quite useful if your displayObject is complicated and needs to be reused multiple times.
     * @method PIXI.IRenderer#generateTexture
     * @param displayObject - The displayObject the object will be generated from.
     * @param {object} options - Generate texture options.
     * @param {PIXI.SCALE_MODES} options.scaleMode - The scale mode of the texture.
     * @param {number} options.resolution - The resolution / device pixel ratio of the texture being generated.
     * @param {PIXI.Rectangle} options.region - The region of the displayObject, that shall be rendered,
     *        if no region is specified, defaults to the local bounds of the displayObject.
     * @param {PIXI.MSAA_QUALITY} options.multisample - The number of samples of the frame buffer.
     * @return A texture of the graphics object.
     */
    generateTexture(displayObject: IRenderableObject, options?: IGenerateTextureOptions): RenderTexture;

    /**
     * Please use the options argument instead.
     *
     * @method PIXI.IRenderer#generateTexture
     * @deprecated Since 6.1.0
     * @param displayObject - The displayObject the object will be generated from.
     * @param scaleMode - The scale mode of the texture.
     * @param resolution - The resolution / device pixel ratio of the texture being generated.
     * @param region - The region of the displayObject, that shall be rendered,
     *        if no region is specified, defaults to the local bounds of the displayObject.
     * @return A texture of the graphics object.
     */
    generateTexture(
          displayObject: IRenderableObject,
          scaleMode?: SCALE_MODES,
          resolution?: number,
          region?: Rectangle): RenderTexture;

    /**
     * @ignore
     */
    generateTexture(displayObject: IRenderableObject,
        options: IGenerateTextureOptions | SCALE_MODES = {},
        resolution?: number, region?: Rectangle): RenderTexture
    {
        // @deprecated parameters spread, use options instead
        if (typeof options === 'number')
        {
            // #if _DEBUG
            deprecation('6.1.0', 'generateTexture options (scaleMode, resolution, region) are now object options.');
            // #endif

            options = { scaleMode: options, resolution, region };
        }

        return this.textureGenerator.generateTexture(displayObject, options);
    }

    /**
     * Collection of installed plugins. These are included by default in PIXI, but can be excluded
     * by creating a custom build. Consult the README for more information about creating custom
     * builds and excluding plugins.
     *
     * @readonly
     * @property {PIXI.AccessibilityManager} accessibility Support tabbing interactive elements.
     * @property {PIXI.Extract} extract Extract image data from renderer.
     * @property {PIXI.InteractionManager} interaction Handles mouse, touch and pointer events.
     * @property {PIXI.ParticleRenderer} particle Renderer for ParticleContainer objects.
     * @property {PIXI.Prepare} prepare Pre-render display objects.
     * @property {PIXI.BatchRenderer} batch Batching of Sprite, Graphics and Mesh objects.
     * @property {PIXI.TilingSpriteRenderer} tilingSprite Renderer for TilingSprite objects.
     */
    static __plugins: IRendererPlugins;

    /**
     * Adds a plugin to the renderer.
     *
     * @param pluginName - The name of the plugin.
     * @param ctor - The constructor function or class for the plugin.
     */
    static registerPlugin(pluginName: string, ctor: IRendererPluginConstructor): void
    {
        Renderer.__plugins = Renderer.__plugins || {};
        Renderer.__plugins[pluginName] = ctor;
    }
}
