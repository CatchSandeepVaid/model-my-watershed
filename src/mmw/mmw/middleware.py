from django.core.handlers.base import BaseHandler
from django.urls import resolve
from django.utils.deprecation import MiddlewareMixin


def bypass_middleware(view):
    view.bypass_middleware = True

    return view


class BypassMiddleware(MiddlewareMixin):
    """
    Customized version of a gist detailing this technique by @bryanhelmig

    See also: https://gist.github.com/bryanhelmig/9d09d1bd9a63504371d2
    """
    def process_request(self, request):
        """Replicates a lot of code from BaseHandler#get_response."""
        callback, callback_args, callback_kwargs = resolve(request.path_info)

        if getattr(callback, 'bypass_middleware', False):
            # bypass_middleware decorator was used; zero out all
            # middleware and return the response.
            handler = BaseHandler()

            handler._request_middleware = []
            handler._view_middleware = []
            handler._template_response_middleware = []
            handler._response_middleware = []
            handler._exception_middleware = []

            response = handler._get_response(request)

            return response
