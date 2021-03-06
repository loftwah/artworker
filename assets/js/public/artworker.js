( function ($) {

	var $document  			= $( document ),
		$window				= $( window ),
		$body				= $( 'body' ),
		$gallery 			= $( '#artwork-gallery' ),
		$artwork    		= $( '.artworker .artworker-artwork-gallery .artwork:not(.noscript)' ),
		$lazy				= $( '.lazy' ),
		$pagination			= $( '.artworker .artworker-pagination' ),
		$loadmore 			= $( '.artworker .artwork-loadmore' ),
		$pswp 				= $( '.pswp' )[0],

		Utils = {

			objects : [

				'Arguments', 
				'Function', 
				'String', 
				'Number', 
				'Date', 
				'RegExp', 
				'Array', 
				'Object', 
				'Null', 
				'Undefined',
				'Boolean'
			],

			set_type_checkers : function () {

				Utils.objects.forEach( function( name ) {

				    Utils[ 'is_' + name.toLowerCase() ] = function( obj ) {

				    	return toString.call( obj ) == '[object ' + name + ']';

				    }; 

				} );

			},

			is_url : function ( url ) {

				var url_regexp = new RegExp( /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi );

				if( ! Utils.is_string( url ) )
					return false;

				if( url == '' )
					return false;
 
				if ( ! url_regexp.test( url ) )
					return false;

				return true;

			},

			is_email : function ( email ) {

				var email_regexp = new RegExp( /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/ );

				if( ! Utils.is_string( email ) )
					return false;

				if( email == '' )
					return false;
 
				if ( ! email_regexp.test( email ) )
					return false;

				return true;

			},

			html_present : function ( content ) {

			 	var regex = new RegExp( /<\/?[a-z][\s\S]*>/i );

			 	return regex.test( content );		

			},

			get_query_string : function ( url = null ) {

				if( Utils.is_null( url ) )
					url = location.search;

			    var regex = new RegExp('[\\?&].*=[^&#]*'),
			    	query_string = url.match(regex);

			    return Utils.is_null( query_string[0] ) ? '' : query_string[0].split('?')[1];

			},

			get_cookies : function () {

				var cookies = {},
					cookies_array = document.cookie.split('; ');

				cookies_array.forEach( function ( cookie ) {

					var name_regexp = new RegExp( '([^\\s]*)=' ),
						cookie_name = cookie.match( name_regexp );

					if( ! cookie || ! Utils.is_array( cookie_name ) )
						return;

					cookies[ cookie_name[1] ] = Utils.get_cookie( cookie_name[1] );
 
				} );

				return cookies;	

			},

			get_cookie : function ( cookie_name ) {

				var regex = new RegExp( '[; ]' + cookie_name + '=([^\\s;]*)' ),
					match = ( ' ' + document.cookie ).match( regex );

				if ( cookie_name && Utils.is_array( match ) ) 
					return unescape( match[1].replace( /\+/g, ' ' ) );
				
				return '';

			},

			get_url_params : function ( url = null, name = null ) {

				var query_string = Utils.get_query_string( url ),
					params = {};

				if ( query_string ) {

					var query_strings = query_string.split('&');

					for ( var i = 0; i < query_strings.length; i++ ) {

						var param = query_strings[i].split( /=(.+)/ ),
							param_name = param[0].toLowerCase(),
							param_value = Utils.is_undefined( param[1] ) ? '' : param[1];

						if ( Utils.is_string( param_value ) ) param_value = param_value.toLowerCase();

						if ( param_name.match(/\[(\d+)?\]$/) ) {

							var key = param_name.replace(/\[(\d+)?\]/, '');
							if ( ! params[key] ) params[key] = [];

							if ( param_name.match(/\[\d+\]$/) ) {

								var index = /\[(\d+)\]/.exec(param_name)[1];
								params[key][index] = param_value;

							} else {

								params[key].push(param_value);

							}

						} else {

							if ( ! params[param_name] ) {

								params[param_name] = param_value;

							} else if ( params[param_name] && Utils.is_string( params[param_name] ) ) {

								params[param_name] = [params[param_name]];
								params[param_name].push( param_value );

							} else {

								params[param_name].push( param_value );

							}

						}

					}

					if( Utils.is_string( name ) && params.hasOwnProperty( name ) ) {

						params = params[ name ];

					}

				}

				return params;
			},

			insert_array_at	: function( array, index, deleteItems, arrayToInsert ) {

				Array.prototype.splice.apply(array, [index, deleteItems].concat(arrayToInsert));

			},

			init : function () {

				Utils.set_type_checkers()

			}

		},


		Artworker = {

			utils 			: Utils,
			galleryItems 	: [],
			currentPage		: 1,
			totalPages		: 1,
			postsPerPage	: parseInt( Artworker_Data.posts_per_page, 10 ),
			defaultImage	: Artworker_Data.default_image,
			loadedPages		: [],
			rowHeight 		: 300,
			rowHeights 		: {

				'xs'	: 300,
				'sm'	: 500,
				'md'	: 550,
				'lg'	: 600,
				'xl'	: 650

			},

			setTotalPages : function () {

				var total = 1;

				if( Utils.is_number( $pagination.data( 'total' ) ) ) {
					total = $pagination.data( 'total' );
				}

				Artworker.totalPages = parseInt( total, 10 );

			},

			setCurrentPage : function ( page ) {

				if( ! Utils.is_number( page ) ) {
					console.log( 'setCurrentPage needs a number' ); 
					return;
				}

				Artworker.currentPage = parseInt( page, 10 );

			},

			getNextPage : function ( currentPage ) {

				var currentPage = ( currentPage ) ? currentPage : Artworker.currentPage;
					nextPage = parseInt( currentPage, 10 ) + 1;			

				return nextPage;

			},

			getPrevPage : function ( currentPage ) {

				var currentPage = ( currentPage ) ? currentPage : Artworker.currentPage;
					prevPage = parseInt( currentPage, 10 ) - 1;

				return prevPage;

			},

			// What page is the illustration on in the gallery?
			determinePage : function ( artwork ) {

				return Math.ceil( parseInt( artwork, 10 ) / parseInt( Artworker.postsPerPage, 10 ) );

			},

			isLoadedPage : function (page) {

				if( $.inArray( page, Artworker.loadedPages ) < 0 ) {

					return false;

				}

				return true;

			},

			isValidPage : function (page) {

				var page = parseInt( page, 10 );

				return ( page > 0 && page <= parseInt( Artworker.totalPages, 10 ) );

			},

			addLoadedPage : function (page) {

				var page = parseInt( page, 10 );

				if( ! Artworker.isLoadedPage( page ) && Artworker.isValidPage( page ) ) {

					Artworker.loadedPages.push( page );

					return true;
				}

				return false;

			},

			setGalleryItems : function ( artwork, options = {} ) {



			},

			getGalleryItems : function ( options = {} ) {

				var defaultOptions = {
						'gallery' : $gallery,
					},
					options = $.extend( defaultOptions, options ),
					items = [];

				if ( options.gallery.find( '.artwork:not(.noscript)' ).length > 0 ) {
					options.gallery.find( '.artwork:not(.noscript)' ).each( function( i, el ) {
						var img = $( el ).find( 'img' );

						if ( img.length ) {
							var large_image_src = img.attr( 'data-large_image' ),
								large_image_w   = img.attr( 'data-large_image_width' ),
								large_image_h   = img.attr( 'data-large_image_height' ),
								item            = {
									src  : large_image_src,
									w    : large_image_w,
									h    : large_image_h,
									title: img.attr( 'data-caption' ) ? img.attr( 'data-caption' ) : img.attr( 'title' )
								};
							items.push( item );
						}
					} );
				}

				return items;

			},

			initializeGallery : function () {

				Artworker.galleryItems = Artworker.getGalleryItems();
				$gallery.flexImages( { rowHeight: Artworker.rowHeight } );
				Artworker.unhideLoadmoreButton();
				Artworker.setTotalPages();

			},

			loadMoreArtwork : function ( e ) {

				e.preventDefault();

				var paged = Artworker.currentPage + 1;

				if( Artworker.currentPage == Artworker.totalPages )
					return;

				Artworker.getArtworks({ 'paged' : paged }, function ( response, data ) {

					var html = response.html,
						status = response.status,
						message = response.message;

					if( status == 'success' ) {
						$gallery.append( html );
						Artworker.galleryItems = Artworker.getGalleryItems();
						$gallery.flexImages( { rowHeight: Artworker.rowHeight } );
						Artworker.setCurrentPage( data['paged'] );	
						$gallery.trigger('artworker:artworkGotten', [response, data] );				
					}

					$gallery.trigger( 'artworker:noArtworkGotten', [response, data] );

				} );

			},

			getArtworks : function ( data = {}, callback = function () {} ) {

				if( Artworker.currentPage == Artworker.totalPages )
					return;

				var data = $.extend( {

					'action' : 'get_artworks',
					'paged' : Artworker.currentPage,

				}, data );

				$.ajax({
					url       : Artworker_Data.ajax_url,
					type      : 'GET',
					data      : data,
					beforeSend: function () {
						//disable loadmore button set to loading
						$gallery.trigger('artworker:getArtworksBeforeSend', [data, callback] );						

					}
				} ).done(function ( response ) {					

					callback( response, data );

					$gallery.trigger('artworker:getArtworksDone', [response, data, callback] );

				} ).fail(function ( response ) {

					console.log( response );
					callback( response, data );

					$gallery.trigger('artworker:getArtworksFailed', [response, data, callback] );

				} ).always(function () {

					$gallery.trigger('artworker:getArtworksAlways', [data, callback] );

				} );				

			},

			addDummySlides		: function () {

				var nextPage = Artworker.getNextPage();

				if( ! Artworker.isLoadedPage( nextPage ) && Artworker.isValidPage( nextPage ) ) {

					for (var i = Artworker.postsPerPage - 1; i >= 0; i--) {

						Artworker.galleryItems.push({

							src: Artworker.defaultImage,
							w: 100,
							h: 100,
							loading: true

						});
						
					}

				}

			},

			getRowHeight	: function () {

				var $winWidth = $window.width(),
					rowHeight = 'xs';


				if( $winWidth > 510 && $winWidth < 750 ) {

					rowHeight = 'sm';

				}

				if( $winWidth > 750 && $winWidth < 1170 ) {

					rowHeight = 'md';

				}

				if( $winWidth > 1170 && $winWidth < 1590 ) {

					rowHeight = 'lg';

				}

				if( $winWidth > 1590 ) {

					rowHeight = 'xl';

				}

				return rowHeight;

			},

			setRowHeight : function () {

				Artworker.rowHeight = Artworker.rowHeights[ Artworker.getRowHeight( $window ) ];
				$gallery.flexImages( { rowHeight: Artworker.rowHeight } );

			},

			openGalleryArtwork : function ( e ) {

				e.preventDefault();

				var $eventTarget = $( e.target ),
					items = Artworker.galleryItems,
					index,
					$clicked;


				if( $eventTarget.is( '.artwork-link' ) || $eventTarget.is( '.artwork-link img' ) ) {
					$clicked = $(this).parent();
					index = parseInt( $clicked.index('.item'), 10 );
				}

				var options = {

					index: index,
					loop: false,
					showHideOpacity: false,
					getThumbBoundsFn: function( index ) {
						var index = parseInt( index, 10 ),
							$items = $('.item'),
							item  = $items[index],
							image = $(item).find('.responsive-image'),
							offset = image.offset();

						if( typeof item === 'undefined' ) {

							return false;

						}

						// This is to account for the WordPress admin toolbar
						if( $( 'body' ).hasClass( 'admin-bar' ) ) {

							if( $window.width() > 782 ) {
								offset.top = offset.top - 32;
							} else if ( $window.width() < 782 && $window.width() > 600 ) {
								offset.top = offset.top - 46;
							} else {
								offset.top = offset.top;
							}
							
						}

						return { x:offset.left, y:offset.top, w:image.width() };
					}

				};

				var gallery = new PhotoSwipe( $pswp, PhotoSwipeUI_Default, items, options );

				gallery.listen('afterChange', function() {

					var index = parseInt( gallery.getCurrentIndex(), 10 ) + 1,
						artworkCount = Artworker.galleryItems.length,
						lastThree = ( artworkCount >= 3 ) ? artworkCount - 3 : artworkCount,
						loadMoreThreshold = Math.ceil( artworkCount * ( 3 / 7 ) );


					if( index >= loadMoreThreshold && index <= artworkCount ) {

						var data = {

							'paged' 	: Artworker.getNextPage( Artworker.determinePage( index ) ),

						};

						gallery.shout( 'getArtwork', data );

						Artworker.getArtworks( data, function( response, data ) {

							var html = response.html,
								status = response.status,
								message = response.message,
								rowHeight = Artworker.getRowHeight( $window ),
								newGalleryItems = Artworker.getGalleryItems( { 'gallery' : $( '<div>' + html + '</div>' ) } ),
								newGalleryItemsLength = newGalleryItems.length,
								startingIndex = gallery.items.length - newGalleryItemsLength;


							if( status == 'success' ) {
								$gallery.append( html );
								Artworker.setCurrentPage( data.paged );
								Artworker.galleryItems = $.merge( gallery.items, newGalleryItems );
								$gallery.flexImages({ rowHeight: Artworker.rowHeights[ rowHeight ] });
							}

							if( index <= artworkCount && index >= lastThree ) {

								gallery.invalidateCurrItems();
								gallery.updateSize(true);

							}

							gallery.ui.update();			

						});

					}

					Artworker.galleryItems = gallery.items;

				} );

				gallery.init();

			},

			openArtwork : function ( e ) {

				e.preventDefault();
				e.stopPropagation();

				var	$artworkImage = $( e.target ),
					$artwork = $artworkImage.parent(),
					artworkData = $artwork.data( 'artwork' ),
					pswpItem = [{
						'id': 'artwork-' + artworkData.id,
						'src': artworkData.src,
						'w': artworkData.width,
						'h': artworkData.height,
						'msrc': artworkData.sizes.medium.url,
						'title': artworkData.title
					}],

					options = {

						index: 0,
						loop: false,
						showHideOpacity: false,
						getThumbBoundsFn: function(index) {
							var index = parseInt( index, 10 ),
								image = $( '#' + pswpItem[index].id ).find('img.artwork-block-image'),
								offset = image.offset();


							// This is to account for the WordPress admin toolbar
							if( $( 'body' ).hasClass( 'admin-bar' ) ) {

								if( $window.width() > 782 ) {
									offset.top = offset.top - 32;
								} else if ( $window.width() < 782 && $window.width() > 600 ) {
									offset.top = offset.top - 46;
								} else {
									offset.top = offset.top;
								}
								
							}

							return {x:offset.left, y:offset.top, w:image.width()};
						}

					},

					artwork = new PhotoSwipe( $pswp, PhotoSwipeUI_Default, pswpItem, options );

				artwork.init();

			},

			playAnimations : function () {
				$( 'body' ).removeClass( 'js-loading' );
			},

			disableLoadmoreButton : function () {

				if( ! $loadmore.attr('disabled') )
					$loadmore.attr( 'disabled', true );

			},

			hideLoadmoreButton : function () {

				if( ! $loadmore.hasClass('hidden') )
					$loadmore.addClass('hidden');

			},

			unhideLoadmoreButton : function () {

				if( $loadmore.hasClass('hidden') )
					$loadmore.removeClass('hidden');		

			},

			maybeHideLoadmoreButton : function () {

				if( Artworker.currentPage == Artworker.totalPages ) {
					Artworker.hideLoadmoreButton();
					Artworker.disableLoadmoreButton();
				}

			},

			init : function () {

				$body.addClass( 'js-loading' );				
				$lazy.addClass('loaded');

				$lazy.unveil( 3000, function() {
					$( this ).css( { opacity: 1 } );
				} );

				$artwork.on( 'click', '.artwork-block-image', Artworker.openArtwork );
				$gallery.on( 'click', '.artwork a', Artworker.openGalleryArtwork );
				$loadmore.on( 'click', Artworker.loadMoreArtwork );
				$window.on( 'resize', Artworker.setRowHeight );
				$window.on( 'load', Artworker.setRowHeight );
				$window.on( 'load', Artworker.playAnimations );
				$window.on( 'load', Artworker.initializeGallery );

				$gallery.on( 'artworker:getArtworksAlways', Artworker.maybeHideLoadmoreButton );
				

			},
		};

	$document.ready( function () {

		Utils.init();
		Artworker.init();

	} );

	window.Artworker = Artworker;

} )( jQuery );