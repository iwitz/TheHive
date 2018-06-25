(function() {
    'use strict';
    angular.module('theHiveControllers')
        .controller('SearchCtrl', function($scope, $q, $stateParams, $uibModal, PSearchSrv, CaseTemplateSrv, CaseTaskSrv, NotificationSrv, EntitySrv, UserInfoSrv, QueryBuilderSrv, localStorageService, metadata) {
            $scope.metadata = metadata;
            $scope.toolbar = [
                {name: 'case', label: 'Cases', icon: 'glyphicon glyphicon-folder-open'},
                {name: 'case_task', label: 'Tasks', icon: 'glyphicon glyphicon-tasks'},
                {name: 'case_artifact', label: 'Observables', icon: 'glyphicon glyphicon-pushpin'},
                {name: 'alert', label: 'Alerts', icon: 'glyphicon glyphicon-alert'},
                {name: 'case_artifact_job', label: 'Jobs', icon: 'glyphicon glyphicon-cog'},
                {name: 'audit', label: 'Audit Logs', icon: 'glyphicon glyphicon-list-alt'}
            ];

            $scope.baseFilter = {
                _and: [
                  {
                      _not: {
                          'status': 'Deleted'
                      }
                  },
                  {
                    _not: {
                        '_in': {
                            '_field': '_type',
                            //'_values': ['dashboard', 'audit', 'data', 'user', 'analyzer', 'case_artifact_job_log']
                            '_values': ['dashboard', 'data', 'user', 'analyzer', 'caseTemplate']
                        }
                    }
                  }
                ]
            };

            $scope.getUserInfo = UserInfoSrv;
            $scope.config = localStorageService.get('search-section') || {
                entity: 'case',
                case: {
                    filters: []
                },
                case_task: {
                    filters: []
                },
                case_artifact: {
                    filters: []
                },
                alert: {
                    filters: []
                },
                case_artifact_job: {
                    filters: []
                },
                audit: {
                    filters: []
                }
            }

            $scope.openEntity = EntitySrv.open;
            $scope.isImage = function(contentType) {
                return angular.isString(contentType) && contentType.indexOf('image') === 0;
            };

            $scope.importAlert = function(event) {
                $uibModal.open({
                    templateUrl: 'views/partials/alert/event.dialog.html',
                    controller: 'AlertEventCtrl',
                    controllerAs: 'dialog',
                    size: 'max',
                    resolve: {
                        event: event,
                        templates: function() {
                            return CaseTemplateSrv.list();
                        }
                    }
                }).result.then(function(response) {
                  $scope.searchResults.update();
                });
            };

            // filters
            $scope.addFilter = function() {
                var entity = $scope.config.entity;

                $scope.config[entity].filters = $scope.config[entity].filters || [];

                $scope.config[entity].filters.push({
                    field: null,
                    type: null
                });
            };

            $scope.removeFilter = function(index) {
                $scope.config[$scope.config.entity].filters.splice(index, 1);
            };

            $scope.clearFilters = function() {
                $scope.config[$scope.config.entity].filters = [];
                $scope.config[$scope.config.entity].search = null;
                $scope.searchResults = null;

                localStorageService.set('search-section', $scope.config);
            }

            $scope.setFilterField = function(filter, entity) {
                var field = $scope.metadata[entity].attributes[filter.field];

                if(!field) {
                    return;
                }

                filter.type = field.type;

                if (field.type === 'date') {
                    filter.value = {
                        from: null,
                        to: null
                    };
                } else {
                    filter.value = null;
                }
            };

            $scope.setEntity = function(entity) {
                $scope.config.entity = entity;
                $scope.search();
            };

            $scope.search = function() {
                var entity = $scope.config.entity,
                    search = $scope.config[entity].search,
                    filters = $scope.config[entity].filters || [],
                    filters_query = null,
                    search_query = null;

                try {
                    if(filters.length > 0) {
                        filters_query = QueryBuilderSrv.buildFiltersQuery($scope.metadata[entity].attributes, filters);
                    }

                    if(search) {
                        search_query = { _string: search};
                    }

                    var criterias = _.without([search_query, filters_query], null, undefined);
                    var query = criterias.length === 0 ? undefined : criterias.length === 1 ? criterias[0] : { _and: criterias };

                    if(query) {
                        localStorageService.set('search-section', $scope.config);

                        $scope.searchResults = PSearchSrv(undefined, $scope.metadata[entity].path, {
                            filter: query,
                            baseFilter: $scope.baseFilter,
                            nparent: 10,
                            nstats: entity === 'audit',
                            skipStream: true
                        });
                    } else {
                        $scope.searchResults = null;
                    }
                } catch(err) {
                    NotificationSrv.log('Invalid filters error', 'error');
                }
            };

            $scope.search();
        });
})();
